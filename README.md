# Bible Battle

Bible Battle is a real-time multiplayer Bible quiz web app built with React, Tailwind CSS, and Supabase Realtime. One host creates a game PIN, players join instantly, and everyone stays synced through question, reveal, leaderboard, and final podium states.

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase (Postgres + Realtime)
- React Router v6
- Vercel-ready SPA routing

## Prerequisites

- Node.js 18+
- npm
- A Supabase project

## Local Setup

1. Clone this repository.
2. Install dependencies.

```bash
npm install
```

3. Copy environment template values.

```bash
cp .env.example .env
```

4. Open .env and set:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

5. In Supabase SQL Editor, run this schema:

```sql
create table sessions (
	id uuid default gen_random_uuid() primary key,
	pin text unique not null,
	status text default 'waiting',
	current_question_index int default 0,
	question_start_time timestamptz,
	created_at timestamptz default now()
);

create table players (
	id uuid default gen_random_uuid() primary key,
	session_id uuid references sessions(id) on delete cascade,
	name text not null,
	score int default 0,
	created_at timestamptz default now()
);

create table answers (
	id uuid default gen_random_uuid() primary key,
	player_id uuid references players(id) on delete cascade,
	session_id uuid references sessions(id) on delete cascade,
	question_index int not null,
	selected_option text not null,
	is_correct bool not null,
	time_taken_ms int not null,
	points_earned int not null,
	created_at timestamptz default now()
);

alter table sessions enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

create policy "public_all_sessions" on sessions for all using (true) with check (true);
create policy "public_all_players" on players for all using (true) with check (true);
create policy "public_all_answers" on answers for all using (true) with check (true);

alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;
```

6. Start development server.

```bash
npm run dev
```

## Build

```bash
npm run build
```

Output directory: dist

## Vercel Deployment

1. Push this project to GitHub.
2. In Vercel, click Add New Project and import your GitHub repository.
3. Vercel build settings:
- Build command: npm run build
- Output directory: dist
4. In Vercel Project Settings, add environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
5. Deploy.

SPA routing is configured through vercel.json:

```json
{
	"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Gameplay Loop

1. Host creates 6-digit PIN and shares it.
2. Players join with name + PIN while session is waiting.
3. Host starts game.
4. Timed questions run in real time from server timestamps.
5. Answers are scored with speed bonus.
6. Reveal and leaderboard screens auto-advance.
7. Final results show confetti and full rankings.
