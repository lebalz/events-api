# Events

[![Node CI](https://github.com/lebalz/events-api/actions/workflows/main.yml/badge.svg)](https://github.com/lebalz/events-api/actions/workflows/main.yml) [![codecov](https://codecov.io/gh/lebalz/events-api/graph/badge.svg?token=O9E8JNGEHN)](https://codecov.io/gh/lebalz/events-api)

## Assumptions
- a teacher can be a klp of maximum one class (`view__UsersAffectedByEvent`)
- klp teaches a lesson 'KS' or 'MC' in it's class

## ENV

| Name                  | Description                                                                                                                                          | Default     |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| `PORT`                | Port to listen on                                                                                                                                    | `3000`      |
| `ICAL_DIR`            | Directory to export .ics files to                                                                                                                    | `./ical`    |
| `EXPORT_DIR`          | Directory to export .xlsx files to                                                                                                                   | `./export`  |
| `UPLOAD_DIR`          | Directory to upload excels for import                                                                                                                | `./uploads` |
| `WITH_DEPLOY_PREVIEW` | When set to `true`, the app will allow requests from `https://deploy-preview-\d+--gbsl-events-app.netlify.app` and use `sameSite=none` instead of strict. |             |

for development only (for seeding the db):

| Name          | Description                               | Example                                |
|:--------------|:------------------------------------------|:---------------------------------------|
| `TEST_USER_ID`| the user used for an unauthorized backend | `97786ad4-9a6c-4fa7-83b6-a07df1f8a8db` |
| `USER_ID`     | id of the test user (no admin privileges) | `97786ad4-9a6c-4fa7-83b6-a07df1f8a8db` |
| `USER_EMAIL`  | email of the test user                    | `foo.bar@bazz.ch`                      |
| `ADMIN_ID`    | id of the test admin                      | `9fe3404a-f21c-4327-9f5a-c2818308fed4` |
| `ADMIN_EMAIL` | email of the test admin                   | `admin.bar@bazz.ch`                    |

Make sure, that the User/Admin props are in sync with the frontend `events-app`.

## Development

Better error reporting for Azure AD: set `loggingNoPII: false` in `src/auth/azure-ad.ts`.

## Setup

```bash
psql postgres # sudo -u postgres psql

postgres=> CREATE ROLE events_api WITH LOGIN PASSWORD 'events_api';
postgres=> ALTER ROLE events_api CREATEDB;
postgres=> \du
postgres=> \q

psql -d postgres -h localhost -U events_api

postgres=> CREATE DATABASE events_api;
postgres=> CREATE DATABASE events_api_test; # for testing
postgres=> \list
postgres=> \c events_api
```

Now run all prisma migrations:

```bash
yarn run prisma migrate dev
```

before you seed the db with default data:

```bash
yarn run prisma db seed
```

This will create a new user with the email/id set over `USER_ID`/`USER_EMAIL` or `ADMIN_ID`/`ADMIN_EMAIL` in the `.env` file.


## Environment

Add dotenv-cli globally to run the tests local:

```bash
yarn global add dotenv-cli
```

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



#### First time

1. Edit the `.env` file and fill in at least the the values that are relevant for development (see above).
2. Setup the database (see above).
3. Run
```bash
yarn install
yarn run prisma migrate dev
yarn run db:reset
yarn run dev
```

If you have troubles with npm or yarn, try to delete the `node_modules` folder and run `yarn install` again.

### Setup Test DB

Once you created your test db, you can run the migrations with:

Make sure to have a `.test.env` file with the correct values.

```bash
# eventually add the global yarn bin to your path
export PATH="$(yarn global bin):$PATH"
dotenv -e .test.env -- yarn run test:db:create
```

### Code Coverage

![](https://codecov.io/gh/lebalz/events-api/graphs/sunburst.svg?token=O9E8JNGEHN)


#### Use unauthorized backend (e.g. when developping offline)

Start the dev server with

```bash
TEST_USER_ID="user@gbsl.ch" yarn run dev
```

This will use the [mock strategy](src/auth/mock.ts) for authentication. To work as intended, you need to set the env-variable `TEST_USER_ID` containing the id of the test user (e.g. in the [.env](.env) file).

```bash
yarn run prisma migrate dev
```

### Reset the database

**Caution**: All data will be lost!

The database is reset and will be seeded with the default data from `prisma/seed.ts`

```bash
yarn run db:reset
```

<details>
<summary>When everythin fails: recreate the database</summary>

```bash
psql -d postgres -h localhost -U events_api


postgres=> DROP DATABASE events_api;
postgres=> CREATE DATABASE events_api;
postgres=> \q

yarn run prisma migrate dev
```

</details>

### DB Models: Typings

[node_modules/.prisma/client/index.d.ts](node_modules/.prisma/client/index.d.ts)

## Start

```bash
yarn run dev
```

### Create new view

```bash
yarn run prisma migrate dev --create-only
#shortcut with name of migration
yarn run prisma migrate dev -n add-events-classes-view --create-only
# add your view definition
yarn run prisma migrate dev
# pull the model definitions to your schema
yarn run prisma db pull
```

### Undo last migration (dev mode only!!!!)

```bash
# connect to current db
psql -d postgres -h localhost -U events_api -d events_api

# check if migration exists and only delete if it does
select * from _prisma_migrations where migration_name ilike '%name%';
# delete migration record from db
delete from _prisma_migrations where migration_name ilike '%name%';
# delete last migration
DELETE FROM _prisma_migrations WHERE started_at = (SELECT MAX(started_at)FROM _prisma_migrations);

# undo your migration, e.g. drop a view
drop view view_name;

# disconnect
\q
```

## Generate Documentation

run

```bash
npx prisma generate
```

this will generate
- [docs](public/prisma-docs/index.html) with the [prisma-docs-generator](https://github.com/pantharshit00/prisma-docs-generator)
- [schema.dbml](prisma/dbml/schema.dbml) with the [prisma-dbml-generator](https://notiz.dev/blog/prisma-dbml-generator)

the docs will be publically available under `/docs/prisma/index.html`.

## Dokku



```sh

dokku apps:create events-api
dokku domains:add events-api $DOMAIN
dokku postgres:create events-api
dokku postgres:link events-api events-api
dokku config:set events-api CLIENT_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
dokku config:set events-api TENANT_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
dokku config:set --no-restart events-api DOKKU_LETSENCRYPT_EMAIL="foo@bar.ch"
dokku config:set hfr-events-api SESSION_SECRET=""
dokku config:set hfr-events-api UNTIS_SCHOOL="gym_Schoolname"
dokku config:set hfr-events-api UNTIS_USER="xyz"
dokku config:set hfr-events-api UNTIS_SECRET="XYZXZXYZ"
dokku config:set hfr-events-api UNTIS_BASE_URL="xyz.webuntis.com"
dokku config:set hfr-events-api EVENTS_APP_URL="https://domain.ch"

dokku storage:ensure-directory hfr-events-api
dokku storage:mount hfr-events-api /var/lib/dokku/data/storage/hfr-events-api/ical:/app/ical

dokku config:set hfr-events-api EXPORT_DIR="/app/ical"


dokku nginx:set events-api client-max-body-size 5mb

## eventually use the latest buildpack s.t. the latest node version is known and can be used
# check the latest tag here: 👉 https://github.com/heroku/heroku-buildpack-nodejs/tags
dokku config:set hfr-events-api BUILDPACK_URL=https://github.com/heroku/heroku-buildpack-nodejs.git#v275

# deploy the app

dokku letsencrypt:enable events-api

# scale the app and ensure the bree runnder is running (as a worker)
dokku ps:scale events-api web=1 worker=1
```

```sh
git remote add dokku dokku@<your-ip>:events-api
git push -u dokku
```

optionally, to get the effectivly user stats behind nginx and cloudflare:

```bash
dokku nginx:set hfr-events-api x-forwarded-proto-value '$http_x_forwarded_proto'
dokku nginx:set hfr-events-api x-forwarded-for-value '$http_x_forwarded_for'
dokku nginx:set hfr-events-api x-forwarded-port-value '$http_x_forwarded_port'

```

## VS Code Config

```json title=settings.json
{
    "jestrunner.jestCommand": "TZ=UTC yarn jest"
}
```