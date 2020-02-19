# Margin Trader

## Build
```bash
npm install # one time on clone
npm run build-contracts # when contracts are updated
npm run vendor # when dapp dependencies are updated
npm run build-dapp # when dapp is updated
```

## Test
```bash
docker-compose up --force-recreate --always-recreate-deps --abort-on-container-exit --remove-orphans --renew-anon-volumes
npm run test
```
You can change which node you are testing against (geth, parity, nethermind) by changing the port in the `jsonRpcEndpoint` variable at the top of `test/index.ts`.  Exposed port for each node can be found in `docker-compose.yml`.

## Run
_TODO_
