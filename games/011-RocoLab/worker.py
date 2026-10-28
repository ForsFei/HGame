"""Local JSON-lines adapter around the MIT NRC_AI engine (no third-party packages)."""
import contextlib
import copy
import json
import os
from pathlib import Path
import random
import sqlite3
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'vendor' / 'nrc'))
DB = sqlite3.connect(f'file:{ROOT / "vendor/nrc/data/nrc.db"}?mode=ro&immutable=1', uri=True)
DB.row_factory = sqlite3.Row
with contextlib.redirect_stdout(sys.stderr):
    from src.models import BattleState, TYPE_CHART, get_type_effectiveness, SkillCategory
    from src.team_builder import TeamBuilder
    from src.skill_db import get_all_skills, load_ability_effects, _TYPE_MAP
    from src.pokemon_nature_table import NATURE_BONUSES
    from src.battle import (DamageCalculator, get_actions, execute_full_turn,
                            check_winner, _trigger_battle_start_effects)
    from src import skill_db, pokemon_db
    skill_db._conn = DB
    pokemon_db._conn = DB
    SKILLS = get_all_skills()
    TeamBuilder.TYPE_MAP.update(_TYPE_MAP)  # upstream builder misses short 地 used by its DB
    from src.effect_models import SkillEffect
    # Eight upstream entries accidentally wrap ON_USE inside another ON_USE.
    # Unwrap only identical timing/filter scopes; preserve conditional semantics.
    for s in SKILLS.values():
        for effect in s.effects:
            if isinstance(effect, SkillEffect):
                effect.effects = [tag for item in effect.effects for tag in
                                  (item.effects if isinstance(item, SkillEffect)
                                   and item.timing == effect.timing and item.filter == effect.filter
                                   else [item])]

ROWS = [dict(r) for r in DB.execute('SELECT * FROM pokemon ORDER BY id')]
SPECIES = {r['name']: r for r in ROWS}
SKILL_ROWS = {r['name']: dict(r) for r in DB.execute('SELECT * FROM skill')}
LEARN = {r['name']: [x[0] for x in DB.execute('SELECT s.name FROM skill s JOIN pokemon_skill ps ON ps.skill_id=s.id WHERE ps.pokemon_id=? ORDER BY s.id', (r['id'],))] for r in ROWS}
STATS = ['hp', 'atk', 'spatk', 'def', 'spdef', 'speed']
TYPE_NAMES = {'normal':'普通','fire':'火','water':'水','grass':'草','electric':'电','ice':'冰','fighting':'武','poison':'毒','ground':'地','flying':'翼','psychic':'幻','bug':'虫','ghost':'幽','dragon':'龙','dark':'恶','steel':'机械','fairy':'萌','light':'光'}
SESSIONS = {}

def require(test, message):
    if not test:
        raise ValueError(message)

def number(value, low, high):
    require(type(value) in (int, float) and low <= value <= high, f'数值应为 {low}–{high}')
    return value

def build(config):
    require(isinstance(config, dict), '精灵配置无效')
    name = config.get('name')
    require(name in SPECIES, '精灵不在本地数据集中')
    names = config.get('skills', [])
    require(isinstance(names, list) and 1 <= len(names) <= 4 and len(set(names)) == len(names), '请配置 1–4 个不同技能')
    require(all(n in LEARN[name] and n in SKILLS for n in names), '包含无法学习的技能')
    nature = config.get('nature', '坦率')
    require(nature in NATURE_BONUSES, '未知性格')
    ivs = config.get('ivs', {})
    require(isinstance(ivs, dict) and all(k in STATS and type(v) is int and v in (0, 60) for k, v in ivs.items()), '个体值仅支持 0 或 60')
    require(sum(v == 60 for v in ivs.values()) <= 3, '最多三项个体值为 60')
    # The upstream builder uses exact species lookup; never allow its fuzzy fallback here.
    p = TeamBuilder._p(name, names, iv_config=ivs, nature=nature)
    if 'stats' in config:
        for key, value in config['stats'].items():
            require(key in STATS, '未知能力值')
            attr = {'atk':'attack','spatk':'sp_attack','def':'defense','spdef':'sp_defense'}.get(key, key)
            setattr(p, attr, number(value, 1, 2000))
        p.hp = round(p.hp)
        p.current_hp = p.hp
    if 'hpPercent' in config:
        p.current_hp = max(1, round(p.hp * number(config['hpPercent'], 1, 100) / 100))
    if 'energy' in config:
        p.energy = int(number(config['energy'], 0, 10))
    for key, value in config.get('modifiers', {}).items():
        require(key in ['atk_up','atk_down','def_up','def_down','spatk_up','spatk_down','spdef_up','spdef_down','speed_up','speed_down'], '未知能力修正')
        setattr(p, key, number(value, 0, 0.9 if key.endswith('down') else 4))
    return p

def skill_json(s):
    row = SKILL_ROWS[s.name]
    return {'name':s.name,'type':TYPE_NAMES[s.skill_type.value], 'category':s.category.value,
            'power':s.power,'cost':s.energy_cost,'hits':s.hit_count,
            'description':row.get('description',''),'configured':bool(s.effects)}

def pet_json(p):
    return {'name':p.name,'type':TYPE_NAMES[p.pokemon_type.value], 'hp':p.current_hp,'maxHp':p.hp,
            'energy':p.energy,'fainted':p.is_fainted,'ability':p.ability,'abilityConfigured':bool(p.ability_effects),
            'nature':p.nature,'stats':{'hp':p.hp,'atk':p.attack,'spatk':p.sp_attack,'def':p.defense,'spdef':p.sp_defense,'speed':p.speed},
            'skills':[skill_json(s) for s in p.skills],
            'status':{k:getattr(p,k) for k in ['poison_stacks','burn_stacks','leech_stacks','meteor_stacks','cute_stacks','frostbite_damage'] if getattr(p,k)},
            'modifiers':{k:getattr(p,k) for k in ['atk_up','atk_down','def_up','def_down','spatk_up','spatk_down','spdef_up','spdef_down','speed_up','speed_down'] if getattr(p,k)}}

def winner(state):
    # Community engine ends by MP; a short 1–3 pet practice roster also ends when empty.
    if not any(not p.is_fainted for p in state.team_a): return 'b'
    if not any(not p.is_fainted for p in state.team_b): return 'a'
    return check_winner(state)

def actions(state, side):
    if winner(state): return []
    team = getattr(state, 'team_' + side)
    current = getattr(state, 'current_' + side)
    legal = list(get_actions(state, side))
    # Upstream get_actions omits voluntary switches. Expose them in our adapter.
    for i,p in enumerate(team):
        if i != current and not p.is_fainted and (-2,i) not in legal:
            legal.append((-2,i))
    return legal

def label(state, side, action):
    if action[0] == -1: return '聚能'
    if action[0] == -2: return '切换 → ' + getattr(state, 'team_'+side)[action[1]].name
    return state.get_current(side).skills[action[0]].name

def action_json(state, side, action):
    result = {'id':list(action), 'label':label(state, side, action), 'kind':'switch' if action[0] == -2 else 'recharge' if action[0] == -1 else 'skill'}
    if action[0] >= 0:
        s = state.get_current(side).skills[action[0]]
        result.update(skill_json(s))
        result['baseDamage'] = DamageCalculator.calculate(state.get_current(side), state.get_current('b' if side=='a' else 'a'), s, weather=state.weather)
    return result

def valid_action(state, side, value):
    require(isinstance(value, list) and all(type(x) is int for x in value), '动作格式无效')
    action = tuple(value)
    require(action in actions(state, side), '动作不可用，请刷新当前回合')
    return action

def evaluate(state, side):
    other = 'b' if side == 'a' else 'a'
    win = winner(state)
    if win: return 10000 if win == side else -10000
    def value(t):
        pets = getattr(state,'team_'+t)
        return getattr(state,'mp_'+t)*180 + sum((100*p.current_hp/max(1,p.hp)+p.energy*1.3) if not p.is_fainted else -80 for p in pets)
    return value(side)-value(other)

def advance(state, a, b):
    execute_full_turn(state,a,b)
    # v1: forced replacements follow engine order; no second network decision inside a turn.
    state.pending_switch_requests.clear()

def choose(state, side, level='standard'):
    legal = actions(state, side)
    require(bool(legal), '对局已结束')
    if level == 'easy': return random.choice(legal)
    other = 'b' if side == 'a' else 'a'
    enemies = actions(state, other)
    ranked = []
    # Evaluate both simultaneously chosen actions, never the opponent's submitted command.
    for action in legal:
        values=[]
        for enemy in enemies:
            sample=copy.deepcopy(state)
            advance(sample, action if side=='a' else enemy, enemy if side=='a' else action)
            values.append(evaluate(sample, side))
        score = (0.7*min(values)+0.3*sum(values)/len(values)) if level=='tactical' else sum(values)/len(values)
        if action[0] == -2: score -= 2
        ranked.append((score,action))
    return max(ranked,key=lambda x:x[0])[1]

def catalog():
    pets=[]
    for r in ROWS:
        pets.append({'name':r['name'],'id':r['id'],'type':r['element'],'ability':r['ability'],
                     'abilityConfigured':bool(load_ability_effects(r['ability'] or '')),
                     'bases':{k:r['base_'+k] for k in STATS},'skills':[n for n in LEARN[r['name']] if n in SKILLS]})
    # Validated presets only include learned skills, including exact form names.
    presets=[]
    for title,names in [('草火水',['喵喵','火花','水蓝蓝']),('战术样例',['千棘盔','圣羽翼王','海豹船长'])]:
        team=[]
        for query in names:
            matches=[r for r in ROWS if r['name']==query or r['name'].startswith(query+'（')]
            if not matches: continue
            name=matches[0]['name']
            known=[SKILLS[n] for n in LEARN[name] if n in SKILLS]
            attack=sorted([s for s in known if s.power>0],key=lambda s:(s.energy_cost>6,TYPE_NAMES[s.skill_type.value]!=SPECIES[name]['element'],-s.power/max(1,s.energy_cost)))
            utility=[s for s in known if s.power<=0 and s.effects]
            preferred={
                '喵喵':['荆棘爪','叶绿光束','光合作用','防御'],
                '火花':['火焰箭','吹火','热身','防御'],
                '水蓝蓝':['水弹枪','气泡','魔法增效','水泡盾'],
                '千棘盔（本来的样子）':['毒液渗透','感染病','泡沫幻影','打湿'],
                '圣羽翼王':['水刃','羽刃','力量增效','疾风连袭'],
                '海豹船长':['水刃','斩断','力量增效','听桥'],
            }
            selected=[]
            for s in [SKILLS[n] for n in preferred.get(name,[]) if n in LEARN[name] and n in SKILLS]+attack[:2]+utility[:2]+known:
                if s.name not in selected: selected.append(s.name)
                if len(selected)==4: break
            if selected: team.append({'name':name,'skills':selected,'nature':'坦率','ivs':{}})
        if team: presets.append({'name':title,'team':team})
    return {'pets':pets,'skills':[skill_json(s) for s in SKILLS.values()], 'natures':list(NATURE_BONUSES),
            'types':TYPE_NAMES,'typeChart':TYPE_CHART,'presets':presets,
            'source':{'project':'ColinHong10/NRC_AI','commit':'9b5801b08d349c6505a233c513faa5075f427035','date':'2026-04-20','skillsConfigured':sum(bool(s.effects) for s in SKILLS.values()),'abilitiesConfigured':sum(bool(p['abilityConfigured']) for p in pets)}}

def get_session(data):
    session = SESSIONS.get(data.get('id'))
    require(session is not None, '对局已失效，请新建对局（服务重启会清空对局）')
    session['touched']=time.time()
    return session

def snapshot(session):
    state=session['state']
    win=winner(state)
    if not win and state.turn>200: win='draw'
    return {'id':session['id'],'version':session['version'],'turn':state.turn,'mode':session['mode'],'difficulty':session['difficulty'],
            'teams':{s:[pet_json(p) for p in getattr(state,'team_'+s)] for s in ['a','b']},
            'active':{'a':state.current_a,'b':state.current_b},'mp':{'a':state.mp_a,'b':state.mp_b},
            'marks':{'a':state.marks_a,'b':state.marks_b},'weather':state.weather,'winner':win,
            'pending':list(session['pending']), 'actions':{s:[] if win else [action_json(state,s,a) for a in actions(state,s)] for s in ['a','b']},
            'history':session['history'][-100:]}

def handle(command, data):
    if command=='catalog': return catalog()
    if command=='create':
        require(data.get('mode') in ['preset','local','model'], '请选择对局模式')
        require(data.get('difficulty','standard') in ['easy','standard','tactical'], '未知人机等级')
        teams=data.get('teams',{})
        require(all(isinstance(teams.get(s),list) and 1<=len(teams[s])<=6 for s in ['a','b']), '双方各配置 1–6 只精灵')
        require(len(teams['a'])==len(teams['b']), '双方队伍数量应相同')
        for s in ['a','b']:
            require(len(set(p.get('name') for p in teams[s]))==len(teams[s]), '同队不能重复精灵')
        state=BattleState([build(p) for p in teams['a']],[build(p) for p in teams['b']])
        # Roster configs cannot sneak battle-only overrides into a new match.
        for s in ['a','b']:
            require(all(not set(p).intersection(['stats','modifiers','energy','hpPercent']) for p in teams[s]), '对局请使用种族值、性格和个体值配置')
        _trigger_battle_start_effects(state)
        for key in list(SESSIONS):
            if time.time()-SESSIONS[key]['touched']>10800: del SESSIONS[key]
        if len(SESSIONS)>=32: del SESSIONS[min(SESSIONS,key=lambda k:SESSIONS[k]['touched'])]
        sid=uuid.uuid4().hex
        session={'id':sid,'state':state,'version':0,'mode':data['mode'],'difficulty':data.get('difficulty','standard'),'pending':{},'history':[],'touched':time.time()}
        SESSIONS[sid]=session
        return snapshot(session)
    if command=='get': return snapshot(get_session(data))
    if command=='context':
        session=get_session(data)
        require(session['mode']=='model', '此对局未启用模型')
        result=snapshot(session)
        require(not result['winner'], '对局已结束')
        # No pending action or opponent's current command is ever sent to the model.
        result.pop('pending')
        result['actions']=result['actions']['b']
        return result
    if command=='step':
        session=get_session(data); state=session['state']
        require(not snapshot(session)['winner'],'对局已结束')
        require(data.get('version')==session['version'], '回合已更新，请同步对局')
        side=data.get('side','a')
        require(side in ['a','b'] and (side=='a' or session['mode']=='local'), '当前模式只允许控制 A 侧')
        require(side not in session['pending'], '本侧已提交，请另一位提交')
        action=valid_action(state,side,data.get('action'))
        pending=dict(session['pending']); pending[side]=action
        if session['mode']!='local':
            pending['b']=valid_action(state,'b',data['modelAction']) if session['mode']=='model' and not data.get('fallback') else choose(state,'b',session['difficulty'])
        if len(pending)<2:
            session['pending']=pending
            return snapshot(session)
        # Commit only after a complete successful simulation; invalid/error requests cannot half-advance a match.
        before={s:[p.current_hp for p in getattr(state,'team_'+s)] for s in ['a','b']}
        entry={'turn':state.turn,'a':label(state,'a',pending['a']),'b':label(state,'b',pending['b'])}
        next_state=copy.deepcopy(state)
        advance(next_state,pending['a'],pending['b'])
        entry['changes']=[f'{s.upper()} {p.name} HP {before[s][i]} → {p.current_hp}' for s in ['a','b'] for i,p in enumerate(getattr(next_state,'team_'+s)) if before[s][i]!=p.current_hp]
        entry['automatic']=data.get('fallback',False)
        session.update(state=next_state,pending={},version=session['version']+1)
        session['history'].append(entry)
        return snapshot(session)
    if command=='calculate':
        a=build(data['attacker']); b=build(data['defender'])
        skill=next((s for s in a.skills if s.name==data.get('skill')),None)
        require(skill is not None,'请选择攻击侧已配置的技能')
        weather=data.get('weather') or None
        require(weather in [None,'rain','snow','sandstorm'],'未知天气')
        if data.get('power') is not None: skill.power=number(data['power'],0,1000)
        if data.get('hits') is not None: skill.hit_count=int(number(data['hits'],1,20))
        magical=skill.category==SkillCategory.MAGICAL
        attack=a.sp_attack if magical else a.attack
        defense=b.sp_defense if magical else b.defense
        up=a.spatk_up if magical else a.atk_up
        down=a.spatk_down if magical else a.atk_down
        d_up=b.spdef_up if magical else b.def_up
        d_down=b.spdef_down if magical else b.def_down
        modifier=(1+up+d_down)/max(.1,1+down+d_up)
        eff=get_type_effectiveness(skill.skill_type,b.pokemon_type)
        stab=1.5 if skill.skill_type==a.pokemon_type else 1
        weather_mult=1.5 if weather=='rain' and skill.skill_type.value=='water' else 1
        damage=DamageCalculator.calculate(a,b,skill,weather=weather)
        a_before=a.current_hp; b_before=b.current_hp
        state=BattleState([copy.deepcopy(a)],[copy.deepcopy(b)],weather=weather)
        defend=data.get('defenderAction',-1)
        require(type(defend) is int,'防御侧指令无效')
        a_idx=next(i for i,s in enumerate(a.skills) if s.name==skill.name)
        # Modified power/hits must be passed to the simulation as well as the formula.
        require((a_idx,) in actions(state,'a'),'攻击侧能量不足以释放所选技能')
        require((defend,) in actions(state,'b'),'防御侧能量不足或所选指令无效')
        advance(state,(a_idx,),(defend,))
        return {'damage':damage,'percent':round(damage/b.hp*100,2),'remaining':max(0,b.current_hp-damage),
                'hitsToKo':None if damage==0 else (b.current_hp+damage-1)//damage,
                'attacker':pet_json(a),'defender':pet_json(b),'skill':skill_json(skill),
                'factors':{'attack':attack,'defense':defense,'abilityLevel':modifier,'power':skill.power,'coefficient':.9,'effectiveness':eff,'stab':stab,'weather':weather_mult,'hits':skill.hit_count},
                'scope':'基础直伤：不含特性触发、条件威力、应对、防御减伤、印记和回合末效果。实际对战由效果引擎结算。',
                'turnComparison':{'aBefore':a_before,'bBefore':b_before,'aAfter':state.team_a[0].current_hp,'bAfter':state.team_b[0].current_hp,'aEnergy':state.team_a[0].energy,'bEnergy':state.team_b[0].energy}}
    raise ValueError('未知操作')

def main():
    for line in sys.stdin:
        try:
            request=json.loads(line)
            with contextlib.redirect_stdout(sys.stderr):
                result=handle(request['command'],request.get('data',{}))
            response={'id':request['id'],'result':result}
        except Exception as error:
            response={'id':request.get('id') if 'request' in locals() else None,'error':str(error) if isinstance(error,(ValueError,KeyError,TypeError)) else '规则引擎执行失败，请更换技能配置后重试'}
            if not isinstance(error,(ValueError,KeyError,TypeError)):
                import traceback
                traceback.print_exc(file=sys.stderr)
        print(json.dumps(response,ensure_ascii=False,allow_nan=False),flush=True)

if __name__=='__main__': main()
