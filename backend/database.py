import os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql+asyncpg://postgres:postgres@localhost:5432/mdd_db',
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"ssl": False},
)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

VALID_TABLES = {'ffu_log', 'boiler_log', 'safety_log'}


async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS chiller_log (
                year         INTEGER NOT NULL,
                month        INTEGER NOT NULL,
                day          INTEGER NOT NULL,
                equipment_id TEXT NOT NULL,
                param_key    TEXT NOT NULL,
                value        TEXT NOT NULL,
                PRIMARY KEY (year, month, day, equipment_id, param_key)
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS chiller_inspector (
                year  INTEGER NOT NULL,
                month INTEGER NOT NULL,
                day   INTEGER NOT NULL,
                name  TEXT NOT NULL,
                PRIMARY KEY (year, month, day)
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS chiller_analysis (
                year       INTEGER NOT NULL,
                month      INTEGER NOT NULL,
                day        INTEGER NOT NULL,
                chiller_id TEXT NOT NULL,
                value      TEXT NOT NULL,
                PRIMARY KEY (year, month, day, chiller_id)
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS ffu_log (
                date      TEXT NOT NULL,
                field_key TEXT NOT NULL,
                value     TEXT NOT NULL,
                PRIMARY KEY (date, field_key)
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS boiler_log (
                date      TEXT NOT NULL,
                field_key TEXT NOT NULL,
                value     TEXT NOT NULL,
                PRIMARY KEY (date, field_key)
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS safety_log (
                date      TEXT NOT NULL,
                field_key TEXT NOT NULL,
                value     TEXT NOT NULL,
                PRIMARY KEY (date, field_key)
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS work_orders (
                wo_no        TEXT NOT NULL,
                work_type    TEXT,
                work_name    TEXT,
                equip_code   TEXT,
                equip_name   TEXT,
                equip_type   TEXT,
                location     TEXT,
                start_date   TEXT,
                end_date     TEXT,
                department   TEXT,
                worker       TEXT,
                writer       TEXT,
                wo_status    TEXT,
                wo_status_normalized TEXT,
                PRIMARY KEY (wo_no)
            )
        '''))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_wo_start ON work_orders(start_date)'))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_wo_dept ON work_orders(department)'))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(wo_status_normalized)'))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS energy_usage (
                util_key  TEXT NOT NULL,
                factory   TEXT NOT NULL,
                date      TEXT NOT NULL,
                value     REAL NOT NULL,
                PRIMARY KEY (util_key, factory, date)
            )
        '''))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_eu_util ON energy_usage(util_key)'))
        # 예산 컬럼 추가 (이미 있으면 무시)
        await conn.execute(text('ALTER TABLE energy_usage ADD COLUMN IF NOT EXISTS budget REAL'))

        # ── 비용 관리 ──────────────────────────────────────────────────────
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS cost_records (
                id        SERIAL PRIMARY KEY,
                month     TEXT NOT NULL,
                item      TEXT NOT NULL,
                category  TEXT NOT NULL DEFAULT '수선비',
                budget    BIGINT NOT NULL DEFAULT 0,
                actual    BIGINT NOT NULL DEFAULT 0,
                owner     TEXT NOT NULL DEFAULT '1P',
                UNIQUE(month, item)
            )
        '''))

        # ── 재고 관리 ──────────────────────────────────────────────────────
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS inventory_items (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                spec        TEXT NOT NULL DEFAULT '',
                current_qty INTEGER NOT NULL DEFAULT 0,
                safety_qty  INTEGER NOT NULL DEFAULT 0,
                price       INTEGER NOT NULL DEFAULT 0,
                rack        TEXT NOT NULL DEFAULT '',
                grade       TEXT NOT NULL DEFAULT 'A',
                order_point INTEGER NOT NULL DEFAULT 0,
                order_qty   INTEGER NOT NULL DEFAULT 0,
                lead_time   TEXT NOT NULL DEFAULT ''
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS inventory_issues (
                id        SERIAL PRIMARY KEY,
                item_id   TEXT NOT NULL REFERENCES inventory_items(id),
                qty       INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                issued_at TEXT NOT NULL
            )
        '''))

        # ── 법규 관리 ──────────────────────────────────────────────────────
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS compliance_officers (
                id        SERIAL PRIMARY KEY,
                role      TEXT NOT NULL,
                name      TEXT NOT NULL,
                dept      TEXT NOT NULL DEFAULT '',
                license   TEXT NOT NULL DEFAULT '',
                due_date  TEXT NOT NULL DEFAULT ''
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS compliance_educations (
                id        SERIAL PRIMARY KEY,
                name      TEXT NOT NULL,
                course    TEXT NOT NULL,
                done_date TEXT NOT NULL DEFAULT '',
                next_date TEXT NOT NULL DEFAULT ''
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS compliance_inspections (
                id        SERIAL PRIMARY KEY,
                target    TEXT NOT NULL,
                area      TEXT NOT NULL DEFAULT '',
                due_date  TEXT NOT NULL DEFAULT '',
                agency    TEXT NOT NULL DEFAULT ''
            )
        '''))

        # ── 예방점검 ───────────────────────────────────────────────────────
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS preventive_plans (
                id          TEXT PRIMARY KEY,
                equipment   TEXT NOT NULL,
                type        TEXT NOT NULL DEFAULT '정기점검',
                cycle       TEXT NOT NULL DEFAULT '월 1회',
                due_date    TEXT NOT NULL DEFAULT '',
                responsible TEXT NOT NULL DEFAULT '',
                plant       TEXT NOT NULL DEFAULT 'P1',
                status      TEXT NOT NULL DEFAULT '예정',
                sheet_id    TEXT NOT NULL DEFAULT ''
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS preventive_results (
                id          TEXT PRIMARY KEY,
                plan_id     TEXT NOT NULL,
                equipment   TEXT NOT NULL,
                result_date TEXT NOT NULL DEFAULT '',
                inspector   TEXT NOT NULL DEFAULT '',
                result      TEXT NOT NULL DEFAULT '정상',
                note        TEXT NOT NULL DEFAULT ''
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS checksheets (
                id   TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT '월간'
            )
        '''))
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS checksheet_items (
                id         TEXT PRIMARY KEY,
                sheet_id   TEXT NOT NULL REFERENCES checksheets(id) ON DELETE CASCADE,
                item       TEXT NOT NULL,
                method     TEXT NOT NULL DEFAULT '',
                standard   TEXT NOT NULL DEFAULT ''
            )
        '''))

        # ── 알람 조치 이력 ─────────────────────────────────────────────────
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS alarm_actions (
                id           SERIAL PRIMARY KEY,
                alarm_id     TEXT NOT NULL,
                equipment    TEXT NOT NULL DEFAULT '',
                issue        TEXT NOT NULL DEFAULT '',
                action_note  TEXT NOT NULL DEFAULT '',
                worker       TEXT NOT NULL DEFAULT '',
                completed_at TEXT NOT NULL
            )
        '''))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_alarm_actions_at ON alarm_actions(completed_at)'))


# ── 냉동기·냉각탑 운전일지 ────────────────────────────────────────────
async def load_chiller_month(year: int, month: int) -> dict:
    mk = f"{year}-{str(month).zfill(2)}"
    result = {}
    async with async_session() as session:
        rows = await session.execute(
            text('SELECT day, equipment_id, param_key, value FROM chiller_log WHERE year=:y AND month=:m'),
            {'y': year, 'm': month},
        )
        for row in rows:
            key = f"{mk}__{row.day}__{row.equipment_id}__{row.param_key}"
            result[key] = row.value
        rows2 = await session.execute(
            text('SELECT day, name FROM chiller_inspector WHERE year=:y AND month=:m'),
            {'y': year, 'm': month},
        )
        for row in rows2:
            result[f"{mk}__{row.day}__inspector"] = row.name
    return result


async def save_chiller_cell(year: int, month: int, day: int, equipment_id: str, param_key: str, value: str):
    async with async_session() as session:
        await session.execute(text('''
            INSERT INTO chiller_log (year, month, day, equipment_id, param_key, value)
            VALUES (:year, :month, :day, :equipment_id, :param_key, :value)
            ON CONFLICT(year, month, day, equipment_id, param_key) DO UPDATE SET value=EXCLUDED.value
        '''), {'year': year, 'month': month, 'day': day,
               'equipment_id': equipment_id, 'param_key': param_key, 'value': value})
        await session.commit()


async def save_chiller_inspector(year: int, month: int, day: int, name: str):
    async with async_session() as session:
        await session.execute(text('''
            INSERT INTO chiller_inspector (year, month, day, name)
            VALUES (:year, :month, :day, :name)
            ON CONFLICT(year, month, day) DO UPDATE SET name=EXCLUDED.name
        '''), {'year': year, 'month': month, 'day': day, 'name': name})
        await session.commit()


async def save_chiller_bulk(year: int, month: int, cells: list, inspectors: list):
    async with async_session() as session:
        for c in cells:
            await session.execute(text('''
                INSERT INTO chiller_log (year, month, day, equipment_id, param_key, value)
                VALUES (:year, :month, :day, :equipment_id, :param_key, :value)
                ON CONFLICT(year, month, day, equipment_id, param_key) DO UPDATE SET value=EXCLUDED.value
            '''), {'year': year, 'month': month, 'day': c['day'],
                   'equipment_id': c['equipment_id'], 'param_key': c['param_key'], 'value': c['value']})
        for ins in inspectors:
            await session.execute(text('''
                INSERT INTO chiller_inspector (year, month, day, name)
                VALUES (:year, :month, :day, :name)
                ON CONFLICT(year, month, day) DO UPDATE SET name=EXCLUDED.name
            '''), {'year': year, 'month': month, 'day': ins['day'], 'name': ins['name']})
        await session.commit()


# ── 냉동기 가동 분석 ──────────────────────────────────────────────────
async def load_chiller_analysis(year: int, month: int) -> dict:
    mk = f"{year}-{str(month).zfill(2)}"
    result = {}
    async with async_session() as session:
        rows = await session.execute(
            text('SELECT day, chiller_id, value FROM chiller_analysis WHERE year=:y AND month=:m'),
            {'y': year, 'm': month},
        )
        for row in rows:
            result[f"{mk}__{row.day}__{row.chiller_id}"] = row.value
    return result


async def save_chiller_analysis_cell(year: int, month: int, day: int, chiller_id: str, value: str):
    async with async_session() as session:
        await session.execute(text('''
            INSERT INTO chiller_analysis (year, month, day, chiller_id, value)
            VALUES (:year, :month, :day, :chiller_id, :value)
            ON CONFLICT(year, month, day, chiller_id) DO UPDATE SET value=EXCLUDED.value
        '''), {'year': year, 'month': month, 'day': day, 'chiller_id': chiller_id, 'value': value})
        await session.commit()


async def save_chiller_analysis_bulk(year: int, month: int, records: list):
    async with async_session() as session:
        for r in records:
            await session.execute(text('''
                INSERT INTO chiller_analysis (year, month, day, chiller_id, value)
                VALUES (:year, :month, :day, :chiller_id, :value)
                ON CONFLICT(year, month, day, chiller_id) DO UPDATE SET value=EXCLUDED.value
            '''), {'year': year, 'month': month, 'day': int(r['day']),
                   'chiller_id': r['chiller_id'], 'value': str(r['value'])})
        await session.commit()


# ── 일별 key-value 공용 CRUD (FFU / Boiler / Safety) ─────────────────
async def load_date_form(table: str, date: str) -> dict:
    if table not in VALID_TABLES:
        raise ValueError(f"Invalid table: {table}")
    result = {}
    async with async_session() as session:
        rows = await session.execute(
            text(f'SELECT field_key, value FROM {table} WHERE date=:date'),
            {'date': date},
        )
        for row in rows:
            result[f"{date}__{row.field_key}"] = row.value
    return result


async def save_date_form_cell(table: str, date: str, field_key: str, value: str):
    if table not in VALID_TABLES:
        raise ValueError(f"Invalid table: {table}")
    async with async_session() as session:
        await session.execute(text(f'''
            INSERT INTO {table} (date, field_key, value)
            VALUES (:date, :field_key, :value)
            ON CONFLICT(date, field_key) DO UPDATE SET value=EXCLUDED.value
        '''), {'date': date, 'field_key': field_key, 'value': value})
        await session.commit()


async def save_date_form_bulk(table: str, date: str, records: list):
    if table not in VALID_TABLES:
        raise ValueError(f"Invalid table: {table}")
    async with async_session() as session:
        for r in records:
            if not r.get('key') or r.get('value') is None:
                continue
            await session.execute(text(f'''
                INSERT INTO {table} (date, field_key, value)
                VALUES (:date, :field_key, :value)
                ON CONFLICT(date, field_key) DO UPDATE SET value=EXCLUDED.value
            '''), {'date': date, 'field_key': r['key'], 'value': str(r['value'])})
        await session.commit()


# ── Work Orders ──────────────────────────────────────────────────────
async def upsert_work_orders(records: list) -> dict:
    inserted = 0
    updated = 0
    async with async_session() as session:
        for r in records:
            # Normalize status: remove spaces for indexing
            raw_status = str(r.get('wo_status', '') or '')
            normalized = raw_status.replace(' ', '')
            existing = await session.execute(
                text('SELECT wo_no FROM work_orders WHERE wo_no=:wo_no'),
                {'wo_no': r.get('wo_no', '')}
            )
            if existing.fetchone():
                updated += 1
            else:
                inserted += 1
            await session.execute(text('''
                INSERT INTO work_orders
                    (wo_no, work_type, work_name, equip_code, equip_name, equip_type,
                     location, start_date, end_date, department, worker, writer,
                     wo_status, wo_status_normalized)
                VALUES
                    (:wo_no, :work_type, :work_name, :equip_code, :equip_name, :equip_type,
                     :location, :start_date, :end_date, :department, :worker, :writer,
                     :wo_status, :wo_status_normalized)
                ON CONFLICT(wo_no) DO UPDATE SET
                    work_type=EXCLUDED.work_type,
                    work_name=EXCLUDED.work_name,
                    equip_code=EXCLUDED.equip_code,
                    equip_name=EXCLUDED.equip_name,
                    equip_type=EXCLUDED.equip_type,
                    location=EXCLUDED.location,
                    start_date=EXCLUDED.start_date,
                    end_date=EXCLUDED.end_date,
                    department=EXCLUDED.department,
                    worker=EXCLUDED.worker,
                    writer=EXCLUDED.writer,
                    wo_status=EXCLUDED.wo_status,
                    wo_status_normalized=EXCLUDED.wo_status_normalized
            '''), {
                'wo_no':              str(r.get('wo_no', '') or ''),
                'work_type':          str(r.get('work_type', '') or ''),
                'work_name':          str(r.get('work_name', '') or ''),
                'equip_code':         str(r.get('equip_code', '') or ''),
                'equip_name':         str(r.get('equip_name', '') or ''),
                'equip_type':         str(r.get('equip_type', '') or ''),
                'location':           str(r.get('location', '') or ''),
                'start_date':         str(r.get('start_date', '') or ''),
                'end_date':           str(r.get('end_date', '') or ''),
                'department':         str(r.get('department', '') or ''),
                'worker':             str(r.get('worker', '') or ''),
                'writer':             str(r.get('writer', '') or ''),
                'wo_status':          raw_status,
                'wo_status_normalized': normalized,
            })
        await session.commit()
    return {'inserted': inserted, 'updated': updated}


async def query_work_orders(
    start_date: str = None, end_date: str = None,
    department: str = None, wo_status: str = None,
    work_type: str = None, equip_type: str = None,
    location: str = None, worker: str = None,
    page: int = 1, page_size: int = 50,
) -> dict:
    conditions = []
    params = {}
    if start_date:
        conditions.append('start_date >= :start_date')
        params['start_date'] = start_date
    if end_date:
        conditions.append('start_date <= :end_date')
        params['end_date'] = end_date
    if department:
        conditions.append('department = :department')
        params['department'] = department
    if wo_status:
        # match normalized (without spaces)
        conditions.append('wo_status_normalized = :wo_status')
        params['wo_status'] = wo_status.replace(' ', '')
    if work_type:
        conditions.append('work_type = :work_type')
        params['work_type'] = work_type
    if equip_type:
        conditions.append('equip_type = :equip_type')
        params['equip_type'] = equip_type
    if location:
        conditions.append('location = :location')
        params['location'] = location
    if worker:
        conditions.append('worker LIKE :worker')
        params['worker'] = f'%{worker}%'

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    offset = (page - 1) * page_size

    async with async_session() as session:
        count_row = await session.execute(
            text(f'SELECT COUNT(*) FROM work_orders {where}'), params
        )
        total = count_row.scalar()

        rows = await session.execute(
            text(f'''SELECT wo_no, work_type, work_name, equip_code, equip_name,
                            equip_type, location, start_date, end_date, department,
                            worker, writer, wo_status
                     FROM work_orders {where}
                     ORDER BY start_date DESC, wo_no DESC
                     LIMIT :limit OFFSET :offset'''),
            {**params, 'limit': page_size, 'offset': offset}
        )
        data = [dict(r._mapping) for r in rows]

    return {'total': total, 'page': page, 'page_size': page_size, 'rows': data}


async def get_work_order_kpi(start_date: str = None, end_date: str = None) -> dict:
    conditions = []
    params = {}
    if start_date:
        conditions.append('start_date >= :start_date')
        params['start_date'] = start_date
    if end_date:
        conditions.append('start_date <= :end_date')
        params['end_date'] = end_date
    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    async with async_session() as session:
        rows = await session.execute(
            text(f'SELECT wo_status_normalized, COUNT(*) as cnt FROM work_orders {where} GROUP BY wo_status_normalized'),
            params
        )
        counts = {r.wo_status_normalized: r.cnt for r in rows}

    confirmed = counts.get('확정', 0)
    drafting  = counts.get('작성중', 0)
    pending   = counts.get('작성대기', 0)
    total     = sum(counts.values())
    return {
        'confirmed': confirmed,
        'drafting':  drafting,
        'pending':   pending,
        'total':     total,
        'other':     total - confirmed - drafting - pending,
    }


async def upsert_energy_usage(records: list) -> dict:
    async with async_session() as session:
        for r in records:
            await session.execute(text('''
                INSERT INTO energy_usage (util_key, factory, date, value, budget)
                VALUES (:util_key, :factory, :date, :value, :budget)
                ON CONFLICT(util_key, factory, date) DO UPDATE SET value=EXCLUDED.value, budget=EXCLUDED.budget
            '''), {**r, 'budget': r.get('budget')})
        await session.commit()
    return {'count': len(records)}


async def delete_energy_usage(util_key: str, factory: str, date: str) -> None:
    async with async_session() as session:
        await session.execute(
            text('DELETE FROM energy_usage WHERE util_key=:util_key AND factory=:factory AND date=:date'),
            {'util_key': util_key, 'factory': factory, 'date': date},
        )
        await session.commit()


async def delete_energy_usage_range(util_key: str, factories: list, start_date: str, end_date: str) -> int:
    if not factories:
        return 0
    placeholders = ','.join([f':f{i}' for i in range(len(factories))])
    params: dict = {'util_key': util_key, 'start_date': start_date, 'end_date': end_date}
    for i, f in enumerate(factories):
        params[f'f{i}'] = f
    async with async_session() as session:
        result = await session.execute(
            text(f'DELETE FROM energy_usage WHERE util_key=:util_key AND factory IN ({placeholders}) AND date >= :start_date AND date <= :end_date'),
            params,
        )
        await session.commit()
        return result.rowcount


async def query_energy_db() -> dict:
    result = {
        uk: {fk: [] for fk in ['f1', 'f2', 'f3', 'fnew']}
        for uk in ['gas', 'steam', 'nitrogen', 'argon']
    }
    async with async_session() as session:
        rows = await session.execute(
            text('SELECT util_key, factory, date, value, budget FROM energy_usage ORDER BY date')
        )
        for row in rows:
            if row.util_key in result and row.factory in result[row.util_key]:
                entry: dict = {'date': row.date, 'value': row.value}
                if row.budget is not None:
                    entry['budget'] = row.budget
                result[row.util_key][row.factory].append(entry)
    return result


async def get_work_order_filter_options() -> dict:
    async with async_session() as session:
        dept_rows  = await session.execute(text('SELECT DISTINCT department FROM work_orders WHERE department != \'\' ORDER BY department'))
        type_rows  = await session.execute(text('SELECT DISTINCT work_type FROM work_orders WHERE work_type != \'\' ORDER BY work_type'))
        etype_rows = await session.execute(text('SELECT DISTINCT equip_type FROM work_orders WHERE equip_type != \'\' ORDER BY equip_type'))
        loc_rows   = await session.execute(text('SELECT DISTINCT location FROM work_orders WHERE location != \'\' ORDER BY location'))
        worker_rows= await session.execute(text('SELECT DISTINCT worker FROM work_orders WHERE worker != \'\' ORDER BY worker'))
        status_rows= await session.execute(text('SELECT DISTINCT wo_status FROM work_orders WHERE wo_status != \'\' ORDER BY wo_status'))
    return {
        'departments': [r[0] for r in dept_rows],
        'work_types':  [r[0] for r in type_rows],
        'equip_types': [r[0] for r in etype_rows],
        'locations':   [r[0] for r in loc_rows],
        'workers':     [r[0] for r in worker_rows],
        'wo_statuses': [r[0] for r in status_rows],
    }


# ── Cost Records ─────────────────────────────────────────────────────
async def get_cost_records(year: str, month: str) -> list:
    ym = f"{year}-{month.zfill(2)}"
    async with async_session() as session:
        rows = await session.execute(
            text('SELECT id, month, item, category, budget, actual, owner FROM cost_records WHERE month=:ym ORDER BY id'),
            {'ym': ym}
        )
        return [dict(r._mapping) for r in rows]

async def upsert_cost_record(month: str, item: str, category: str, budget: int, actual: int, owner: str) -> int:
    async with async_session() as session:
        result = await session.execute(text('''
            INSERT INTO cost_records (month, item, category, budget, actual, owner)
            VALUES (:month, :item, :category, :budget, :actual, :owner)
            ON CONFLICT(month, item) DO UPDATE SET
                category=EXCLUDED.category, budget=EXCLUDED.budget,
                actual=EXCLUDED.actual, owner=EXCLUDED.owner
            RETURNING id
        '''), {'month': month, 'item': item, 'category': category,
               'budget': budget, 'actual': actual, 'owner': owner})
        row = result.fetchone()
        await session.commit()
        return row[0]

async def delete_cost_record(record_id: int) -> None:
    async with async_session() as session:
        await session.execute(text('DELETE FROM cost_records WHERE id=:id'), {'id': record_id})
        await session.commit()


# ── Inventory ─────────────────────────────────────────────────────────
async def get_inventory_items() -> list:
    async with async_session() as session:
        rows = await session.execute(
            text('SELECT id, name, spec, current_qty, safety_qty, price, rack, grade, order_point, order_qty, lead_time FROM inventory_items ORDER BY id')
        )
        items = []
        for r in rows:
            d = dict(r._mapping)
            d['status'] = '부족' if d['current_qty'] <= d['safety_qty'] else '정상'
            items.append(d)
        return items

async def add_inventory_item(data: dict) -> str:
    async with async_session() as session:
        count_row = await session.execute(text('SELECT COUNT(*) FROM inventory_items'))
        count = count_row.scalar() + 1
        new_id = f"MAT-{str(count).zfill(3)}"
        await session.execute(text('''
            INSERT INTO inventory_items (id, name, spec, current_qty, safety_qty, price, rack, grade, order_point, order_qty, lead_time)
            VALUES (:id, :name, :spec, :current_qty, :safety_qty, :price, :rack, :grade, :order_point, :order_qty, :lead_time)
        '''), {'id': new_id, **data})
        await session.commit()
        return new_id

async def update_inventory_qty(item_id: str, delta: int) -> int:
    async with async_session() as session:
        result = await session.execute(text('''
            UPDATE inventory_items SET current_qty = current_qty + :delta
            WHERE id=:id RETURNING current_qty
        '''), {'id': item_id, 'delta': delta})
        row = result.fetchone()
        await session.commit()
        return row[0] if row else 0

async def add_inventory_issue(item_id: str, qty: int, user_name: str, issued_at: str) -> None:
    async with async_session() as session:
        await session.execute(text('''
            INSERT INTO inventory_issues (item_id, qty, user_name, issued_at)
            VALUES (:item_id, :qty, :user_name, :issued_at)
        '''), {'item_id': item_id, 'qty': qty, 'user_name': user_name, 'issued_at': issued_at})
        await session.commit()

async def get_inventory_issues(start: str = None, end: str = None) -> list:
    conditions = []
    params = {}
    if start:
        conditions.append('issued_at >= :start')
        params['start'] = start
    if end:
        conditions.append('issued_at <= :end')
        params['end'] = end
    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    async with async_session() as session:
        rows = await session.execute(
            text(f'SELECT id, item_id, qty, user_name, issued_at FROM inventory_issues {where} ORDER BY issued_at DESC'),
            params
        )
        return [dict(r._mapping) for r in rows]


# ── Compliance ─────────────────────────────────────────────────────────
async def get_compliance_officers() -> list:
    async with async_session() as session:
        rows = await session.execute(text('SELECT id, role, name, dept, license, due_date FROM compliance_officers ORDER BY id'))
        return [dict(r._mapping) for r in rows]

async def add_compliance_officer(role: str, name: str, dept: str, license: str, due_date: str) -> int:
    async with async_session() as session:
        result = await session.execute(text('''
            INSERT INTO compliance_officers (role, name, dept, license, due_date)
            VALUES (:role, :name, :dept, :license, :due_date) RETURNING id
        '''), {'role': role, 'name': name, 'dept': dept, 'license': license, 'due_date': due_date})
        row = result.fetchone()
        await session.commit()
        return row[0]

async def delete_compliance_officer(record_id: int) -> None:
    async with async_session() as session:
        await session.execute(text('DELETE FROM compliance_officers WHERE id=:id'), {'id': record_id})
        await session.commit()

async def get_compliance_educations() -> list:
    async with async_session() as session:
        rows = await session.execute(text('SELECT id, name, course, done_date, next_date FROM compliance_educations ORDER BY id'))
        return [dict(r._mapping) for r in rows]

async def add_compliance_education(name: str, course: str, done_date: str, next_date: str) -> int:
    async with async_session() as session:
        result = await session.execute(text('''
            INSERT INTO compliance_educations (name, course, done_date, next_date)
            VALUES (:name, :course, :done_date, :next_date) RETURNING id
        '''), {'name': name, 'course': course, 'done_date': done_date, 'next_date': next_date})
        row = result.fetchone()
        await session.commit()
        return row[0]

async def delete_compliance_education(record_id: int) -> None:
    async with async_session() as session:
        await session.execute(text('DELETE FROM compliance_educations WHERE id=:id'), {'id': record_id})
        await session.commit()

async def get_compliance_inspections() -> list:
    async with async_session() as session:
        rows = await session.execute(text('SELECT id, target, area, due_date, agency FROM compliance_inspections ORDER BY due_date'))
        return [dict(r._mapping) for r in rows]

async def add_compliance_inspection(target: str, area: str, due_date: str, agency: str) -> int:
    async with async_session() as session:
        result = await session.execute(text('''
            INSERT INTO compliance_inspections (target, area, due_date, agency)
            VALUES (:target, :area, :due_date, :agency) RETURNING id
        '''), {'target': target, 'area': area, 'due_date': due_date, 'agency': agency})
        row = result.fetchone()
        await session.commit()
        return row[0]

async def delete_compliance_inspection(record_id: int) -> None:
    async with async_session() as session:
        await session.execute(text('DELETE FROM compliance_inspections WHERE id=:id'), {'id': record_id})
        await session.commit()


# ── Preventive Inspection ─────────────────────────────────────────────
async def get_preventive_plans() -> list:
    async with async_session() as session:
        rows = await session.execute(text('SELECT id, equipment, type, cycle, due_date, responsible, plant, status, sheet_id FROM preventive_plans ORDER BY due_date'))
        return [dict(r._mapping) for r in rows]

async def add_preventive_plan(data: dict) -> str:
    async with async_session() as session:
        count_row = await session.execute(text('SELECT COUNT(*) FROM preventive_plans'))
        count = count_row.scalar() + 1
        new_id = f"P-{str(count).zfill(3)}"
        await session.execute(text('''
            INSERT INTO preventive_plans (id, equipment, type, cycle, due_date, responsible, plant, status, sheet_id)
            VALUES (:id, :equipment, :type, :cycle, :due_date, :responsible, :plant, :status, :sheet_id)
        '''), {'id': new_id, **data})
        await session.commit()
        return new_id

async def update_preventive_plan_status(plan_id: str, status: str) -> None:
    async with async_session() as session:
        await session.execute(text('UPDATE preventive_plans SET status=:status WHERE id=:id'), {'id': plan_id, 'status': status})
        await session.commit()

async def get_preventive_results() -> list:
    async with async_session() as session:
        rows = await session.execute(text('SELECT id, plan_id, equipment, result_date, inspector, result, note FROM preventive_results ORDER BY result_date DESC'))
        return [dict(r._mapping) for r in rows]

async def add_preventive_result(data: dict) -> str:
    async with async_session() as session:
        count_row = await session.execute(text('SELECT COUNT(*) FROM preventive_results'))
        count = count_row.scalar() + 1
        new_id = f"R-{str(count).zfill(3)}"
        await session.execute(text('''
            INSERT INTO preventive_results (id, plan_id, equipment, result_date, inspector, result, note)
            VALUES (:id, :plan_id, :equipment, :result_date, :inspector, :result, :note)
            ON CONFLICT(id) DO NOTHING
        '''), {'id': new_id, **data})
        await session.commit()
        return new_id

async def get_checksheets() -> list:
    async with async_session() as session:
        rows = await session.execute(text('SELECT id, name, type FROM checksheets ORDER BY id'))
        sheets = []
        for r in rows:
            sheet = dict(r._mapping)
            items_rows = await session.execute(
                text('SELECT id, item, method, standard FROM checksheet_items WHERE sheet_id=:sid ORDER BY id'),
                {'sid': sheet['id']}
            )
            sheet['items'] = [dict(ir._mapping) for ir in items_rows]
            sheets.append(sheet)
        return sheets

async def add_checksheet(sheet_id: str, name: str, sheet_type: str) -> None:
    async with async_session() as session:
        await session.execute(text('''
            INSERT INTO checksheets (id, name, type) VALUES (:id, :name, :type)
            ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type
        '''), {'id': sheet_id, 'name': name, 'type': sheet_type})
        await session.commit()

async def add_checksheet_item(item_id: str, sheet_id: str, item: str, method: str, standard: str) -> None:
    async with async_session() as session:
        count_row = await session.execute(text('SELECT COUNT(*) FROM checksheet_items'))
        count = count_row.scalar() + 1
        new_id = item_id or f"I-{str(count).zfill(3)}"
        await session.execute(text('''
            INSERT INTO checksheet_items (id, sheet_id, item, method, standard)
            VALUES (:id, :sheet_id, :item, :method, :standard)
            ON CONFLICT(id) DO UPDATE SET item=EXCLUDED.item, method=EXCLUDED.method, standard=EXCLUDED.standard
        '''), {'id': new_id, 'sheet_id': sheet_id, 'item': item, 'method': method, 'standard': standard})
        await session.commit()


# ── Alarm Actions ──────────────────────────────────────────────────────
async def add_alarm_action(alarm_id: str, equipment: str, issue: str, action_note: str, worker: str, completed_at: str) -> int:
    async with async_session() as session:
        result = await session.execute(text('''
            INSERT INTO alarm_actions (alarm_id, equipment, issue, action_note, worker, completed_at)
            VALUES (:alarm_id, :equipment, :issue, :action_note, :worker, :completed_at)
            RETURNING id
        '''), {'alarm_id': alarm_id, 'equipment': equipment, 'issue': issue,
               'action_note': action_note, 'worker': worker, 'completed_at': completed_at})
        row = result.fetchone()
        await session.commit()
        return row[0]

async def get_alarm_actions(start: str = None, end: str = None) -> list:
    conditions = []
    params = {}
    if start:
        conditions.append('completed_at >= :start')
        params['start'] = start
    if end:
        conditions.append('completed_at <= :end')
        params['end'] = end
    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    async with async_session() as session:
        rows = await session.execute(
            text(f'SELECT id, alarm_id, equipment, issue, action_note, worker, completed_at FROM alarm_actions {where} ORDER BY completed_at DESC'),
            params
        )
        return [dict(r._mapping) for r in rows]


# ── Dashboard Summary ──────────────────────────────────────────────────
async def get_dashboard_summary() -> dict:
    from datetime import date
    today = date.today().isoformat()
    async with async_session() as session:
        status_rows = await session.execute(
            text('SELECT wo_status_normalized, COUNT(*) as cnt FROM work_orders GROUP BY wo_status_normalized')
        )
        counts = {r.wo_status_normalized: r.cnt for r in status_rows}
        total = sum(counts.values())
        pending   = counts.get('작성대기', 0)
        drafting  = counts.get('작성중', 0)
        confirmed = counts.get('확정', 0)
        alarm_cnt = await session.execute(text('SELECT COUNT(*) FROM alarm_actions'))
        alarm_count = alarm_cnt.scalar()
    return {
        'wo_total': total,
        'wo_pending': pending,
        'wo_drafting': drafting,
        'wo_confirmed': confirmed,
        'alarm_completed': alarm_count,
    }

async def upsert_work_order_single(data: dict) -> str:
    raw_status = str(data.get('wo_status', '') or '')
    normalized = raw_status.replace(' ', '')
    async with async_session() as session:
        await session.execute(text('''
            INSERT INTO work_orders
                (wo_no, work_type, work_name, equip_code, equip_name, equip_type,
                 location, start_date, end_date, department, worker, writer,
                 wo_status, wo_status_normalized)
            VALUES
                (:wo_no, :work_type, :work_name, :equip_code, :equip_name, :equip_type,
                 :location, :start_date, :end_date, :department, :worker, :writer,
                 :wo_status, :wo_status_normalized)
            ON CONFLICT(wo_no) DO UPDATE SET
                work_type=EXCLUDED.work_type, work_name=EXCLUDED.work_name,
                equip_code=EXCLUDED.equip_code, equip_name=EXCLUDED.equip_name,
                equip_type=EXCLUDED.equip_type, location=EXCLUDED.location,
                start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
                department=EXCLUDED.department, worker=EXCLUDED.worker,
                writer=EXCLUDED.writer, wo_status=EXCLUDED.wo_status,
                wo_status_normalized=EXCLUDED.wo_status_normalized
        '''), {
            'wo_no': data.get('wo_no', ''),
            'work_type': data.get('work_type', ''),
            'work_name': data.get('work_name', ''),
            'equip_code': data.get('equip_code', ''),
            'equip_name': data.get('equip_name', ''),
            'equip_type': data.get('equip_type', ''),
            'location': data.get('location', ''),
            'start_date': data.get('start_date', ''),
            'end_date': data.get('end_date', ''),
            'department': data.get('department', ''),
            'worker': data.get('worker', ''),
            'writer': data.get('writer', ''),
            'wo_status': raw_status,
            'wo_status_normalized': normalized,
        })
        await session.commit()
    return data.get('wo_no', '')

async def update_work_order_status(wo_no: str, status: str) -> None:
    normalized = status.replace(' ', '')
    async with async_session() as session:
        await session.execute(text('''
            UPDATE work_orders SET wo_status=:status, wo_status_normalized=:normalized
            WHERE wo_no=:wo_no
        '''), {'wo_no': wo_no, 'status': status, 'normalized': normalized})
        await session.commit()
