# Events

## Development

Better error reporting for Azure AD: set `loggingNoPII: false` in `src/auth/azure-ad.ts`.

```bash
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

## Dokku



```sh

dokku apps:create events-api
dokku domains:add events-api $DOMAIN
dokku postgres:create events-api
dokku postgres:link events-api events-api
dokku config:set events-api CLIENT_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
dokku config:set events-api TENANT_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
dokku config:set --no-restart events-api DOKKU_LETSENCRYPT_EMAIL="foo@bar.ch"
dokku config:set hfr-events-api CORS_ORIGIN="allowed.domain.ch"
dokku config:set hfr-events-api SESSION_SECRET=""
dokku config:set hfr-events-api UNTIS_SCHOOL="gym_Schoolname"
dokku config:set hfr-events-api UNTIS_USER="xyz"
dokku config:set hfr-events-api UNTIS_SECRET="XYZXZXYZ"
dokku config:set hfr-events-api UNTIS_BASE_URL="xyz.webuntis.com"
dokku config:set hfr-events-api SESSION_SECRET="asdfg"

dokku nginx:set events-api client-max-body-size 5mb

# deploy the app

dokku letsencrypt:enable events-api
```

```sh
git remote add dokku dokku@<your-ip>:events-api
git push -u dokku
```