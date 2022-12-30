# Events

## Setup

```bash
psql postgres # sudo -u postgres psql

postgres=# CREATE ROLE events_api WITH LOGIN PASSWORD 'events_api';
postgres=# ALTER ROLE events_api CREATEDB;
postgres=# \du
postgres=# \q

psql -d postgres -h localhost -U events_api

postgres=# CREATE DATABASE events_api;
postgres=# \list
postgres=# \c events_api
```
### Setup DBPrisma JS

```bash
yarn run prisma migrate dev
```

## Start

```bash
yarn run dev
```

