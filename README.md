# Events

## Setup

```bash
psql postgres # sudo -u postgres psql

postgres=# CREATE ROLE events_api WITH LOGIN PASSWORD 'events_api';
postgres=# ALTER ROLE events_api CREATEDB;
postgres=# \du
postgres=# \q

psql -d postgres -U events_api

postgres=# CREATE DATABASE events_api;
postgres=# \list
postgres=# \c events_api
```