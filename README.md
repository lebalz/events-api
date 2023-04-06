# Events

## Development

Better error reporting for Azure AD: set `loggingNoPII: false` in `src/auth/azure-ad.ts`.

```bash
## Setup

```bash
psql postgres # sudo -u postgres psql

postgres=> CREATE ROLE events_api WITH LOGIN PASSWORD 'events_api';
postgres=> ALTER ROLE events_api CREATEDB;
postgres=> \du
postgres=> \q

psql -d postgres -h localhost -U events_api

postgres=> CREATE DATABASE events_api;
postgres=> \list
postgres=> \c events_api
```

## Environment

Copy the `example.env` file to `.env` and fill in the values.

```bash
cp example.env .env
```

The `ADMIN_UI_PASSWORD` is used to access the admin UI from https://admin.socket.io. 

```
password ---bcrypt---> $2y$10$EDCixge1.O2YaBVq44CgJeNjRSA3a.x7vSkwegyjASlMhmWmF7Azm
```
In the example, the password is `password`. 

**Caution** when this env is not set, the authentication is disabled.

👉 https://socket.io/docs/v4/admin-ui/#available-options



#### Use unauthorized backend (e.g. when developping offline)

Start the dev server with

```bash
NODE_ENV=test yarn run dev
```

This will use the [mock strategy](src/auth/mock.ts) for authentication. To work as intended, you need to set the env-variable `TEST_USER_ID` containing the id of the test user (e.g. in the [.env](.env) file).

```bash
yarn run prisma migrate dev
```

### Drop all migrations and create new DB

```bash
psql -d postgres -h localhost -U events_api


postgres=> DROP DATABASE events_api;
postgres=> CREATE DATABASE events_api;
postgres=> \q

yarn run prisma migrate dev
```

### DB Models: Typings

[node_modules/.prisma/client/index.d.ts](node_modules/.prisma/client/index.d.ts)

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

dokku storage:ensure-directory hfr-events-api
dokku storage:mount hfr-events-api /var/lib/dokku/data/storage/hfr-events-api/ical:/app/ical

dokku nginx:set events-api client-max-body-size 5mb

# deploy the app

dokku letsencrypt:enable events-api
```

```sh
git remote add dokku dokku@<your-ip>:events-api
git push -u dokku
```