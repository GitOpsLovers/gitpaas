## [2.12.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.11.0...v2.12.0) (2026-09-03)

### Features

* make logs visually stable ([141db81](https://github.com/GitOpsLovers/gitpaas/commit/141db81215df26c44984afe1266bb69ab4b684cc))
* **projects:** show services and networks as tabs ([#222](https://github.com/GitOpsLovers/gitpaas/issues/222)) ([7b9340f](https://github.com/GitOpsLovers/gitpaas/commit/7b9340f939b7c75bba65611c6ffa7b243bd6dce9))

### Bug Fixes

* recreate networks on deploy ([0127097](https://github.com/GitOpsLovers/gitpaas/commit/0127097a6d8bc743b60b857cbbbed23269678696))

## [2.11.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.10.0...v2.11.0) (2026-09-03)

### Features

* **frontend:** design tokens for visual identity phase 1 ([#212](https://github.com/GitOpsLovers/gitpaas/issues/212)) ([62baf15](https://github.com/GitOpsLovers/gitpaas/commit/62baf157526409594095c1c38922948cc8c4fbe1))
* **frontend:** shell and mark for visual identity phase 2 ([#213](https://github.com/GitOpsLovers/gitpaas/issues/213)) ([c221465](https://github.com/GitOpsLovers/gitpaas/commit/c2214658f91edf6bfe2d1858112789123d654dbe))
* **namespaces:** add description and creation date ([#220](https://github.com/GitOpsLovers/gitpaas/issues/220)) ([4ceec40](https://github.com/GitOpsLovers/gitpaas/commit/4ceec40d18de679e6a8b1591cc47289ec375d14a))

### Bug Fixes

* add runtime logs migration ([74f573e](https://github.com/GitOpsLovers/gitpaas/commit/74f573e7cd1ccc112194a008041f5a55885d2ef5))

## [2.10.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.9.0...v2.10.0) (2026-09-02)

### Features

* improve profile UI ([8c0612c](https://github.com/GitOpsLovers/gitpaas/commit/8c0612cf1b5c69c543408282fbd1901890510d5e))
* improve serve page UI ([28f2a24](https://github.com/GitOpsLovers/gitpaas/commit/28f2a244ff92aede3126c4bc3dce6e193a03a3fc))
* improve service card UI ([4cf048b](https://github.com/GitOpsLovers/gitpaas/commit/4cf048b7a5a1ba2e8876586970b8b61bf0fcd0f5))
* **server-settings:** show domain warning and acknowledgment ([#210](https://github.com/GitOpsLovers/gitpaas/issues/210)) ([659fa12](https://github.com/GitOpsLovers/gitpaas/commit/659fa12d56d474cddc80a7073f29305c4016db62))
* **server:** add domain warning and confirmation ([#209](https://github.com/GitOpsLovers/gitpaas/issues/209)) ([06032bd](https://github.com/GitOpsLovers/gitpaas/commit/06032bdff65bddd23c94a94db8d35fce62bbce1a))
* **server:** add public host address and AAAA resolution ([#207](https://github.com/GitOpsLovers/gitpaas/issues/207)) ([eee561c](https://github.com/GitOpsLovers/gitpaas/commit/eee561c5d6a28cf84a6041965bf8b850c78ca4c7))
* **server:** recognize cloudflare from ip ranges ([#208](https://github.com/GitOpsLovers/gitpaas/issues/208)) ([0e5a704](https://github.com/GitOpsLovers/gitpaas/commit/0e5a7045f9c8969f37f65e105db6ad7c20be1ef8))

## [2.9.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.8.1...v2.9.0) (2026-09-01)

### Features

* **auth:** add second factor TOTP endpoints ([#203](https://github.com/GitOpsLovers/gitpaas/issues/203)) ([2908db9](https://github.com/GitOpsLovers/gitpaas/commit/2908db99105ec0eaa2c9211aa5210f8e96cb877c))
* **auth:** add two-step login and user header ([#205](https://github.com/GitOpsLovers/gitpaas/issues/205)) ([617a9a3](https://github.com/GitOpsLovers/gitpaas/commit/617a9a321179b9d5ab81decd6f757c4ca8d88faf))
* **logs:** add runtime log contract and reader ([#196](https://github.com/GitOpsLovers/gitpaas/issues/196)) ([f659f33](https://github.com/GitOpsLovers/gitpaas/commit/f659f33c9d21ff2e56800a33032b9eda627a3283))
* **logs:** add runtime log endpoints ([#198](https://github.com/GitOpsLovers/gitpaas/issues/198)) ([ef80be2](https://github.com/GitOpsLovers/gitpaas/commit/ef80be2d1777e501ce68bdf1e71edb06b232185b))
* **logs:** add runtime log store and retention ([#197](https://github.com/GitOpsLovers/gitpaas/issues/197)) ([2a5d65b](https://github.com/GitOpsLovers/gitpaas/commit/2a5d65bd6e726f4957aa228dadf7015c330db4ce))
* **logs:** add service logs api and component ([#199](https://github.com/GitOpsLovers/gitpaas/issues/199)) ([664804d](https://github.com/GitOpsLovers/gitpaas/commit/664804d7a2516733d51949fcf86835ede93239b3))
* **profile:** add profile endpoints ([#202](https://github.com/GitOpsLovers/gitpaas/issues/202)) ([82502c6](https://github.com/GitOpsLovers/gitpaas/commit/82502c693c4f4c80bbcefe3f85d5f68ca28cb7fb))
* **profile:** add profile page ([#204](https://github.com/GitOpsLovers/gitpaas/issues/204)) ([1338676](https://github.com/GitOpsLovers/gitpaas/commit/1338676e9d3b6c5caffeb9c400d6a7eaf30244a3))
* **services:** show service state indicator ([#193](https://github.com/GitOpsLovers/gitpaas/issues/193)) ([f23946b](https://github.com/GitOpsLovers/gitpaas/commit/f23946be67731f4f680058309df05b8fa85a6137))
* **ui:** add icon to breadcrumb title ([#194](https://github.com/GitOpsLovers/gitpaas/issues/194)) ([615bf92](https://github.com/GitOpsLovers/gitpaas/commit/615bf92105c00829fe19606bc667e88747e57fbe))
* **users:** add profile and 2fa data schema ([#201](https://github.com/GitOpsLovers/gitpaas/issues/201)) ([aece449](https://github.com/GitOpsLovers/gitpaas/commit/aece44934e2f69463921c5528c55b5f399199b07))

## [2.8.1](https://github.com/GitOpsLovers/gitpaas/compare/v2.8.0...v2.8.1) (2026-08-31)

### Bug Fixes

* change some maintenance copies ([e39a8b2](https://github.com/GitOpsLovers/gitpaas/commit/e39a8b2a5d69cda379f716656fed9c26976de48a))
* **server:** prevent platform updates from hanging ([#192](https://github.com/GitOpsLovers/gitpaas/issues/192)) ([d627323](https://github.com/GitOpsLovers/gitpaas/commit/d6273231ee58ec8f38e8d9a1ece89bbfbd83ed4a))

## [2.8.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.7.0...v2.8.0) (2026-08-31)

### Features

* **frontend:** add description and date to forms and cards ([#191](https://github.com/GitOpsLovers/gitpaas/issues/191)) ([b070714](https://github.com/GitOpsLovers/gitpaas/commit/b070714dba109acc94635e878052b6188ac8f7b6))
* improve version presentation ([0a01f30](https://github.com/GitOpsLovers/gitpaas/commit/0a01f3045e684e3cc9da82723448d175ceaf2cb4))

## [2.7.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.6.0...v2.7.0) (2026-08-31)

### Features

* **server:** add check for updates button ([#189](https://github.com/GitOpsLovers/gitpaas/issues/189)) ([2f76469](https://github.com/GitOpsLovers/gitpaas/commit/2f764699b0b1df40097df0e57e91e6fb4bb6fa7e))
* **server:** add on-demand update check endpoint ([#188](https://github.com/GitOpsLovers/gitpaas/issues/188)) ([e35c506](https://github.com/GitOpsLovers/gitpaas/commit/e35c506590f26d88d7f7c0f546c9bddc16ddf9ae))
* **ui-improvements:** add description and createdAt fields ([#186](https://github.com/GitOpsLovers/gitpaas/issues/186)) ([a936502](https://github.com/GitOpsLovers/gitpaas/commit/a93650288569c958ef2cdacd43fbface05afe756))

### Bug Fixes

* **authentication:** exempt only public auth endpoints ([#187](https://github.com/GitOpsLovers/gitpaas/issues/187)) ([5ad915e](https://github.com/GitOpsLovers/gitpaas/commit/5ad915e2049c75a8a545b9dcd193b8aad6e059ff))

## [2.6.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.5.0...v2.6.0) (2026-08-31)

### Features

* **server-settings:** add domain field to settings tab ([#184](https://github.com/GitOpsLovers/gitpaas/issues/184)) ([f63528c](https://github.com/GitOpsLovers/gitpaas/commit/f63528c287f8292d300e58aec4ec08f045c5cd95))
* **server-settings:** add gitpaasDomain field to api ([#182](https://github.com/GitOpsLovers/gitpaas/issues/182)) ([ec1488e](https://github.com/GitOpsLovers/gitpaas/commit/ec1488eed545e42040f0836202a34bffb3c5e8d2))
* **server:** validate domain and update env file ([#183](https://github.com/GitOpsLovers/gitpaas/issues/183)) ([2cf71bb](https://github.com/GitOpsLovers/gitpaas/commit/2cf71bbed6f8e39c9e10bed6c1fc6857e5ea6f06))
* **skeleton-loaders:** add card skeletons to list containers ([#178](https://github.com/GitOpsLovers/gitpaas/issues/178)) ([17a9a38](https://github.com/GitOpsLovers/gitpaas/commit/17a9a3868181498eb9fc7be17fea15e398df6104))
* **skeleton-loaders:** add skeleton loaders to forms and panel ([#180](https://github.com/GitOpsLovers/gitpaas/issues/180)) ([e21fa10](https://github.com/GitOpsLovers/gitpaas/commit/e21fa10e2c595ec56c92e1636d1d38a7e69c2430))
* **skeleton-loaders:** add table row skeletons ([#179](https://github.com/GitOpsLovers/gitpaas/issues/179)) ([69405de](https://github.com/GitOpsLovers/gitpaas/commit/69405deab6c71e188df40f202f1e391bc6b5e28e))
* **skeleton:** add shared skeleton loader component ([#177](https://github.com/GitOpsLovers/gitpaas/issues/177)) ([15f3608](https://github.com/GitOpsLovers/gitpaas/commit/15f3608d40ba5f99526b857a2c1d021581729c65))

### Bug Fixes

* add correcto permissions to Traefik ([a4a1c9b](https://github.com/GitOpsLovers/gitpaas/commit/a4a1c9b3fb7a4ef96b099dcf23ebe8fb631a6294))

## [2.5.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.4.0...v2.5.0) (2026-08-30)

### Features

* show domains form after button click ([d45ab8c](https://github.com/GitOpsLovers/gitpaas/commit/d45ab8c1f45e5b7ada27f4ed0931a6ffaf1d8467))
* **sidebar:** add version block to sidebar ([#175](https://github.com/GitOpsLovers/gitpaas/issues/175)) ([d6ce5db](https://github.com/GitOpsLovers/gitpaas/commit/d6ce5dbbdef0f0248b5609a2f19a5dc8fdb8c848))

### Bug Fixes

* clear old GitPaaS unused images ([485f8c5](https://github.com/GitOpsLovers/gitpaas/commit/485f8c51a08bc28e29cfc6cbbde0561d8091dbcd))

## [2.4.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.3.0...v2.4.0) (2026-08-30)

### Features

* add namespaces to breadcrumbs ([8e4eec6](https://github.com/GitOpsLovers/gitpaas/commit/8e4eec65205b0aa6ade503c3650d6a917a672e88))
* rename configuration tab to environment ([888e590](https://github.com/GitOpsLovers/gitpaas/commit/888e59000c9c26ef51f585ad7fba356ec0afbb66))

### Bug Fixes

* certificate status error ([8ab05de](https://github.com/GitOpsLovers/gitpaas/commit/8ab05dec31de432c8b766a5568cef38940e1de3a))

## [2.3.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.2.1...v2.3.0) (2026-08-29)

### Features

* **core:** add network support to container runtime ([#168](https://github.com/GitOpsLovers/gitpaas/issues/168)) ([64d9bb8](https://github.com/GitOpsLovers/gitpaas/commit/64d9bb891b8bdbfb1d6c3569721a02837ab10333))
* **deployments:** attach networks at deployment ([#171](https://github.com/GitOpsLovers/gitpaas/issues/171)) ([c7bad5b](https://github.com/GitOpsLovers/gitpaas/commit/c7bad5b3ddde99de941f0f6ca3ec20d63a5e3ee3))
* **networks:** add persistence of project networks ([#169](https://github.com/GitOpsLovers/gitpaas/issues/169)) ([414c833](https://github.com/GitOpsLovers/gitpaas/commit/414c83318fe561197abf95679bea7c6189551415))
* **networks:** add project networks API ([#170](https://github.com/GitOpsLovers/gitpaas/issues/170)) ([7546dca](https://github.com/GitOpsLovers/gitpaas/commit/7546dcae2b4705a9c2478f0b8e8572454d4c7213))
* **networks:** add project networks interface ([#173](https://github.com/GitOpsLovers/gitpaas/issues/173)) ([77c6b28](https://github.com/GitOpsLovers/gitpaas/commit/77c6b28cf5b7eac293cae9ae44c25bc33c303cf6))
* **networks:** read networks of a service ([#172](https://github.com/GitOpsLovers/gitpaas/issues/172)) ([a79154f](https://github.com/GitOpsLovers/gitpaas/commit/a79154fcefa89c142e937437ce7795425fbf6c8b))

## [2.2.1](https://github.com/GitOpsLovers/gitpaas/compare/v2.2.0...v2.2.1) (2026-08-29)

### Bug Fixes

* add platform settings migration ([6bdb934](https://github.com/GitOpsLovers/gitpaas/commit/6bdb934703a0edcfda92ca4dc0e524d40adba84f))

## [2.2.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.1.1...v2.2.0) (2026-08-29)

### Features

* **frontend:** add platform update UI components ([#166](https://github.com/GitOpsLovers/gitpaas/issues/166)) ([b5e2ab3](https://github.com/GitOpsLovers/gitpaas/commit/b5e2ab33b854e5ca2f4298b6c1c03e3e051d7a7e))
* **platform-update:** add update script and app versioning ([#164](https://github.com/GitOpsLovers/gitpaas/issues/164)) ([d7d68f9](https://github.com/GitOpsLovers/gitpaas/commit/d7d68f98b7db040299407fc01a6eda6aa5720813))
* **server:** add health labels and refresh button ([#162](https://github.com/GitOpsLovers/gitpaas/issues/162)) ([0ad1d2d](https://github.com/GitOpsLovers/gitpaas/commit/0ad1d2dc37ccca15b75237d0f5ced207189e614a))
* **server:** add health probes for stack services ([#161](https://github.com/GitOpsLovers/gitpaas/issues/161)) ([c308ce9](https://github.com/GitOpsLovers/gitpaas/commit/c308ce9f7735fd05aa98b13892a202ef67b2f84d))
* **server:** add platform update check and endpoints ([#165](https://github.com/GitOpsLovers/gitpaas/issues/165)) ([ebc9cc3](https://github.com/GitOpsLovers/gitpaas/commit/ebc9cc3445c2308a177c42c00321f899a618f2b2))

## [2.1.1](https://github.com/GitOpsLovers/gitpaas/compare/v2.1.0...v2.1.1) (2026-08-28)

### Bug Fixes

* make Let's encryt email mandatory ([bd9123b](https://github.com/GitOpsLovers/gitpaas/commit/bd9123ba2f806d0153ba81258e8d4ea266a18784))

## [2.1.0](https://github.com/GitOpsLovers/gitpaas/compare/v2.0.0...v2.1.0) (2026-08-26)

### Features

* add Deploy button to deployments list ([ea221d6](https://github.com/GitOpsLovers/gitpaas/commit/ea221d62021a4acfa552a7069ed6441dd81fc115))
* **domains:** add domain management feature ([#146](https://github.com/GitOpsLovers/gitpaas/issues/146)) ([3cec7ba](https://github.com/GitOpsLovers/gitpaas/commit/3cec7ba15726e339ace1368a1fdc1b20ae3d5711))
* **domains:** add domains tab to service detail ([#150](https://github.com/GitOpsLovers/gitpaas/issues/150)) ([9fb5b9c](https://github.com/GitOpsLovers/gitpaas/commit/9fb5b9c18f5822f08d0fe8d2fbe6e72ee179d9ee))
* **domains:** add reverse proxy port and adapter ([#147](https://github.com/GitOpsLovers/gitpaas/issues/147)) ([1bac428](https://github.com/GitOpsLovers/gitpaas/commit/1bac4287935d2e18f49889d6cbe8d6a2445b1708))
* **domains:** add reverse proxy traefik to production runtime ([#145](https://github.com/GitOpsLovers/gitpaas/issues/145)) ([bcd179c](https://github.com/GitOpsLovers/gitpaas/commit/bcd179cfd795757216fc70fa9d44b0ca9395ba80))
* **domains:** add routing at deployment ([#149](https://github.com/GitOpsLovers/gitpaas/issues/149)) ([507e8f2](https://github.com/GitOpsLovers/gitpaas/commit/507e8f2d791496de338d0a7e57bd90f2e8ed8391))
* **infra:** add ACME path configuration ([#153](https://github.com/GitOpsLovers/gitpaas/issues/153)) ([b3476be](https://github.com/GitOpsLovers/gitpaas/commit/b3476bed180130470bca760495a9fc243905d6d0))
* **infra:** add reverse proxy to local stack ([#152](https://github.com/GitOpsLovers/gitpaas/issues/152)) ([bfcbc33](https://github.com/GitOpsLovers/gitpaas/commit/bfcbc333b23640c3a80395eece2f20efd848e3ac))

### Bug Fixes

* show deployment status on refresh ([5d4d028](https://github.com/GitOpsLovers/gitpaas/commit/5d4d0286c5502b1381d9ac6b18b50b35fcb008c5))

## [2.0.0](https://github.com/GitOpsLovers/gitpaas/compare/v1.4.0...v2.0.0) (2026-08-25)

### ⚠ BREAKING CHANGES

* **request-model:** initialize contracts package (phase 1) (#112)

### Features

* add service environment ([#136](https://github.com/GitOpsLovers/gitpaas/issues/136)) ([94b7741](https://github.com/GitOpsLovers/gitpaas/commit/94b7741ffdfb7ff136f9c7465da78a7a1bfc1b5f))
* **agents-metrics:** add phase 1 script and changelog plan ([#133](https://github.com/GitOpsLovers/gitpaas/issues/133)) ([32ea2af](https://github.com/GitOpsLovers/gitpaas/commit/32ea2afffb3b45c7c67e838c924baf263ab96721))
* change styles of service configuration ([753bab4](https://github.com/GitOpsLovers/gitpaas/commit/753bab428359b451dc9aa82f0039dc1f0a89a2f9))
* **logs:** add removal of expired logs (phase 2) ([#129](https://github.com/GitOpsLovers/gitpaas/issues/129)) ([b310ecd](https://github.com/GitOpsLovers/gitpaas/commit/b310ecd5ff6a5e56eb020737766384ddbd611844))
* **logs:** deliver phase 5 of log-retention change ([#132](https://github.com/GitOpsLovers/gitpaas/issues/132)) ([6c49826](https://github.com/GitOpsLovers/gitpaas/commit/6c49826432b3ccaa7a6d79c1df661c86a3270f2b))
* **logs:** handle error events in deployment log stream ([#111](https://github.com/GitOpsLovers/gitpaas/issues/111)) ([304c6cf](https://github.com/GitOpsLovers/gitpaas/commit/304c6cf7c8c27108442d7d2531638f3789ba3717))
* **logs:** separate log state in response (phase 3) ([#130](https://github.com/GitOpsLovers/gitpaas/issues/130)) ([414c4db](https://github.com/GitOpsLovers/gitpaas/commit/414c4db38b858435bf7fd1db9a5a042a59f9c97d))
* **request-model:** authentication contracts slice ([#117](https://github.com/GitOpsLovers/gitpaas/issues/117)) ([1433c76](https://github.com/GitOpsLovers/gitpaas/commit/1433c76378ddd3bd0d0629192b258323a7a4609c))
* **request-model:** deployments contracts slice ([#116](https://github.com/GitOpsLovers/gitpaas/issues/116)) ([96e25e3](https://github.com/GitOpsLovers/gitpaas/commit/96e25e30d2466e23a78602d590f2c1dafbefefc3))
* **request-model:** initialize contracts package (phase 1) ([#112](https://github.com/GitOpsLovers/gitpaas/issues/112)) ([a631505](https://github.com/GitOpsLovers/gitpaas/commit/a631505ba927c7793c086893d598ad3dcb2fcd65))
* **request-model:** iso timestamps on the wire (phase 3) ([#114](https://github.com/GitOpsLovers/gitpaas/issues/114)) ([393cc51](https://github.com/GitOpsLovers/gitpaas/commit/393cc515d637a261b612bc19045870302f4fc3ca))
* **request-model:** namespaces, containers and networks contracts slice ([#120](https://github.com/GitOpsLovers/gitpaas/issues/120)) ([e0535a1](https://github.com/GitOpsLovers/gitpaas/commit/e0535a1515fc8642d316904df6e44ce048eeb521))
* **request-model:** phase 5 shapes that only one side has ([#122](https://github.com/GitOpsLovers/gitpaas/issues/122)) ([110bd6b](https://github.com/GitOpsLovers/gitpaas/commit/110bd6be091ace8b47fddb34fa6f6add83d82dea))
* **request-model:** phase 6 generated openapi specification and reference ([#123](https://github.com/GitOpsLovers/gitpaas/issues/123)) ([252ffb7](https://github.com/GitOpsLovers/gitpaas/commit/252ffb76e21df1715bea155e42c63262aa890ead))
* **request-model:** phase 7 removal of the old machinery ([#124](https://github.com/GitOpsLovers/gitpaas/issues/124)) ([06e4c85](https://github.com/GitOpsLovers/gitpaas/commit/06e4c852be6a9eb726cfe6c2a3a2fbc7efc312a8))
* **request-model:** phase 8 close migration with specification sync ([#125](https://github.com/GitOpsLovers/gitpaas/issues/125)) ([0ad8e32](https://github.com/GitOpsLovers/gitpaas/commit/0ad8e3256d51bbdaa1afea721eb76e6d963c48f5))
* **request-model:** projects contracts slice (phase 2) ([#113](https://github.com/GitOpsLovers/gitpaas/issues/113)) ([774cdcb](https://github.com/GitOpsLovers/gitpaas/commit/774cdcbc4af46af5b537626c3d553c06908eae9d))
* **request-model:** providers contracts slice ([#118](https://github.com/GitOpsLovers/gitpaas/issues/118)) ([2511c0e](https://github.com/GitOpsLovers/gitpaas/commit/2511c0e35f0d7f10211fe323ee9c2ce200dc8ba2))
* **request-model:** server contracts slice ([#119](https://github.com/GitOpsLovers/gitpaas/issues/119)) ([f1fcb73](https://github.com/GitOpsLovers/gitpaas/commit/f1fcb73a21e5f770ea4af6a6a3478dc04f4cfb62))
* **request-model:** services contracts slice ([#115](https://github.com/GitOpsLovers/gitpaas/issues/115)) ([28d2689](https://github.com/GitOpsLovers/gitpaas/commit/28d268940f441e7f93f100ed167c8f8736e5bbd1))
* **server:** add platform settings (phase 1) ([#128](https://github.com/GitOpsLovers/gitpaas/issues/128)) ([49261f1](https://github.com/GitOpsLovers/gitpaas/commit/49261f1f47dde60d86d334b3f650083f898dbe8f))
* **server:** add server screen tabs for health, maintenance and settings ([#131](https://github.com/GitOpsLovers/gitpaas/issues/131)) ([908a25c](https://github.com/GitOpsLovers/gitpaas/commit/908a25c3d06db71f1f7b36e7483838336f64055e))
* **service-env-secrets:** set up encryption for environment secrets ([#135](https://github.com/GitOpsLovers/gitpaas/issues/135)) ([8e963f7](https://github.com/GitOpsLovers/gitpaas/commit/8e963f73cb726b3965af40688e290b9336c7fed5))
* **service-environment:** add configuration tab for service variables ([#141](https://github.com/GitOpsLovers/gitpaas/issues/141)) ([f2b7419](https://github.com/GitOpsLovers/gitpaas/commit/f2b74195b101e11674ed5e97de92a7f8e8171db5))
* **service-environment:** inject environment at deployment ([#139](https://github.com/GitOpsLovers/gitpaas/issues/139)) ([c599fd0](https://github.com/GitOpsLovers/gitpaas/commit/c599fd0bbe192eb393b90285197ae60c3c2593f3))

### Bug Fixes

* add Contracts compilation on Dockerfiles ([492c014](https://github.com/GitOpsLovers/gitpaas/commit/492c014cbff8ad60e07c7146ea2972584bda6331))
* emit errors on Docker compose process ([6855a88](https://github.com/GitOpsLovers/gitpaas/commit/6855a88257c4e60ea06289c6e57c9b519ab465d2))

## [1.4.0](https://github.com/GitOpsLovers/gitpaas/compare/v1.3.0...v1.4.0) (2026-08-20)

### Features

* **providers:** add convertAppManifest to provider client port (phase 4) ([#95](https://github.com/GitOpsLovers/gitpaas/issues/95)) ([ec85705](https://github.com/GitOpsLovers/gitpaas/commit/ec857054c705f493620d4c02e7d7a962028526b0))
* **providers:** add GitHub App registration endpoints (phase 6 - partial) ([#103](https://github.com/GitOpsLovers/gitpaas/issues/103)) ([d8a4bc6](https://github.com/GitOpsLovers/gitpaas/commit/d8a4bc6bfd159b0ad49f6c00bedcf7071ac4320e))
* **providers:** add GitHub App registration use cases and operations ([#102](https://github.com/GitOpsLovers/gitpaas/issues/102)) ([3962def](https://github.com/GitOpsLovers/gitpaas/commit/3962defe947e33704e6c0b18783a940463b63079))
* **providers:** add incomplete state to provider card ([#108](https://github.com/GitOpsLovers/gitpaas/issues/108)) ([356a1f7](https://github.com/GitOpsLovers/gitpaas/commit/356a1f774031e5392ce5db44d9c847fe1ca551cf))
* **providers:** add permissions checking for provider apps ([#77](https://github.com/GitOpsLovers/gitpaas/issues/77)) ([476ca23](https://github.com/GitOpsLovers/gitpaas/commit/476ca23ae54dedbff08667c93013075d0bfa7051))
* **providers:** add scheduled job to remove expired registrations ([#104](https://github.com/GitOpsLovers/gitpaas/issues/104)) ([7e52e01](https://github.com/GitOpsLovers/gitpaas/commit/7e52e01cfa9a2ce6e182a89acb9dd1e5c9e2e9f9))
* **providers:** add screens for GitHub registration returns ([#107](https://github.com/GitOpsLovers/gitpaas/issues/107)) ([388e780](https://github.com/GitOpsLovers/gitpaas/commit/388e7801032ec64be8d290d7a33112909c3ec0f6))
* **providers:** add the two paths of the provider creation screen ([#105](https://github.com/GitOpsLovers/gitpaas/issues/105)) ([f297fc8](https://github.com/GitOpsLovers/gitpaas/commit/f297fc82c815cb3c29408751e652510e6cec87f5))
* **providers:** persist provider registration state between GitHub visits ([#80](https://github.com/GitOpsLovers/gitpaas/issues/80)) ([9f49921](https://github.com/GitOpsLovers/gitpaas/commit/9f499213257524f1fc9d63d483c3bd3b645bec68))
* **providers:** provider test answers outcome ([#78](https://github.com/GitOpsLovers/gitpaas/issues/78)) ([32f8c7d](https://github.com/GitOpsLovers/gitpaas/commit/32f8c7dabdfac833db2f911b42378556403ec320))

### Bug Fixes

* **agents:** remove stale aliases and reference canonical docs ([#85](https://github.com/GitOpsLovers/gitpaas/issues/85)) ([4f9b139](https://github.com/GitOpsLovers/gitpaas/commit/4f9b13977f0ad49c4b325bbe16d5bb3a7e9f8163))
* **tailadmin-ui-patterns:** correct source of truth of TailAdmin skill ([#83](https://github.com/GitOpsLovers/gitpaas/issues/83)) ([e9ecf99](https://github.com/GitOpsLovers/gitpaas/commit/e9ecf9911e6bdbdfcebaf70a2d3685d30cc02e8f))

## [1.3.0](https://github.com/GitOpsLovers/gitpaas/compare/v1.2.0...v1.3.0) (2026-08-16)

### Features

* proxy Backend with Nginx ([#76](https://github.com/GitOpsLovers/gitpaas/issues/76)) ([a5b3a3c](https://github.com/GitOpsLovers/gitpaas/commit/a5b3a3c7afbc9a7ef5d71b70977f25361da3cc00))

## [1.2.0](https://github.com/GitOpsLovers/gitpaas/compare/v1.1.0...v1.2.0) (2026-08-16)

### Features

* add server status to Frontend ([b64baa0](https://github.com/GitOpsLovers/gitpaas/commit/b64baa0fb3f5b9d21d076868ed2257420887513c))
* add source countrol - phase 1 ([11050f9](https://github.com/GitOpsLovers/gitpaas/commit/11050f91c10cc8cb738edc1b289037373fd11628))
* delete obsolete code ([e813043](https://github.com/GitOpsLovers/gitpaas/commit/e813043fbd6355942b389a3a7fc8ab8c6a392128))
* finish Proviers feature ([ab6e208](https://github.com/GitOpsLovers/gitpaas/commit/ab6e2081980e3cc52d5e48ee89e36e42e83ca52d))
* **frontend:** add source control section ([#70](https://github.com/GitOpsLovers/gitpaas/issues/70)) ([873de4a](https://github.com/GitOpsLovers/gitpaas/commit/873de4abe73b12d7f3eb3eabe50e55fe32a9691e))
* **providers:** add provider record with encryption and repository ([#65](https://github.com/GitOpsLovers/gitpaas/issues/65)) ([757833e](https://github.com/GitOpsLovers/gitpaas/commit/757833e26252b0bc1ed647e6190d04cd77250b48))
* **providers:** add the API of the providers ([#67](https://github.com/GitOpsLovers/gitpaas/issues/67)) ([80f32cf](https://github.com/GitOpsLovers/gitpaas/commit/80f32cf15d739153cdf94dc887877fa71bbd38d5))
* **services:** add provider selection UI and make provider optional ([#71](https://github.com/GitOpsLovers/gitpaas/issues/71)) ([f4060bd](https://github.com/GitOpsLovers/gitpaas/commit/f4060bd649911abb751fa7f32566e676779127fc))
* **services:** bind services to providers ([#69](https://github.com/GitOpsLovers/gitpaas/issues/69)) ([883ee3d](https://github.com/GitOpsLovers/gitpaas/commit/883ee3d578cc9df6074a89ec48a33fcc44b19e3b))
* **source-control:** consolidate provider module into capability ([#68](https://github.com/GitOpsLovers/gitpaas/issues/68)) ([2baeb76](https://github.com/GitOpsLovers/gitpaas/commit/2baeb76ed8082f6a4d15228972ff1bfe4997fba5))
* **source-control:** pass provider credentials through the port ([#66](https://github.com/GitOpsLovers/gitpaas/issues/66)) ([7184db3](https://github.com/GitOpsLovers/gitpaas/commit/7184db3041ff333f93c3c873a544f185086086e9))

### Bug Fixes

* fix install script syntax error ([c2b637f](https://github.com/GitOpsLovers/gitpaas/commit/c2b637fce08db46cc468f296d8c4ea52bf845517))

## [1.1.0](https://github.com/GitOpsLovers/gitpaas/compare/v1.0.0...v1.1.0) (2026-08-14)

### Features

* **frontend:** add namespaces feature with components and routes ([#63](https://github.com/GitOpsLovers/gitpaas/issues/63)) ([cc9fd0e](https://github.com/GitOpsLovers/gitpaas/commit/cc9fd0e6ee8afd3e799bef160978fa9088a0454c))
* **frontend:** scope project screens under namespaces ([#64](https://github.com/GitOpsLovers/gitpaas/issues/64)) ([764f5a2](https://github.com/GitOpsLovers/gitpaas/commit/764f5a2f5fe95158a29581f7e6c347eefc7aa3f1))
* improve installer script ([204d9e1](https://github.com/GitOpsLovers/gitpaas/commit/204d9e1ef917d02e5b6353b21484ee81d5f9ff80))
* **namespaces:** add namespace entity with CRUD operations ([#61](https://github.com/GitOpsLovers/gitpaas/issues/61)) ([58b3e84](https://github.com/GitOpsLovers/gitpaas/commit/58b3e84b71f9f61c6ac8a8610d5c37c807b22318))
* **projects:** scope under namespaces ([#62](https://github.com/GitOpsLovers/gitpaas/issues/62)) ([9342979](https://github.com/GitOpsLovers/gitpaas/commit/9342979f43cb78da436517f3eea1f0f3cdcbb0a7))

### Bug Fixes

* add version to checkout step ([a6e690c](https://github.com/GitOpsLovers/gitpaas/commit/a6e690cb9a59588063e8169124d24f6b9c3d4ff3))

## 1.0.0 (2026-08-13)

### Features

* abstract tabs ([14e945a](https://github.com/GitOpsLovers/gitpaas/commit/14e945ae5c86288023bb2c00f5a63a1188884d1b))
* add Agent instructions ([300a637](https://github.com/GitOpsLovers/gitpaas/commit/300a63766ab5547d665b393ad55a959b7a176f7a))
* add AI instructions ([deaa0f4](https://github.com/GitOpsLovers/gitpaas/commit/deaa0f4fa0750e23703290bf101892ebaaadab51))
* add AI skills ([f4d8163](https://github.com/GitOpsLovers/gitpaas/commit/f4d81636bb6848f444b944efb15a3e9b9cc7755e))
* add apps ([b1dc6c8](https://github.com/GitOpsLovers/gitpaas/commit/b1dc6c8a5efc8f84dd53d65edc569c81bc1b8447))
* add Backend providers feature ([f317ddd](https://github.com/GitOpsLovers/gitpaas/commit/f317ddd2471e41bf802fe2199dad09a64d009ff0))
* add confirmation modals ([f8508fe](https://github.com/GitOpsLovers/gitpaas/commit/f8508fe9094659f4277976c5a7d9add11bddc3d1))
* add containers tab ([66d395d](https://github.com/GitOpsLovers/gitpaas/commit/66d395dc2211e021926374525ab960a4af7dc477))
* add database transformers ([3eac4e9](https://github.com/GitOpsLovers/gitpaas/commit/3eac4e9298b5d2f1e4bf5b6126813fb86746d302))
* Add dedicated SSE throttler ([393c468](https://github.com/GitOpsLovers/gitpaas/commit/393c468f74f3f59d2f0758bac3af7b8d534fca16))
* add deployments feature ([4e63782](https://github.com/GitOpsLovers/gitpaas/commit/4e637827e00d7c9eb5e15988a7152084ce492efc))
* add Devcontainer ([ddfa337](https://github.com/GitOpsLovers/gitpaas/commit/ddfa337a0d0779978536453ab39b8873867063ed))
* add documenter agent ([547bd59](https://github.com/GitOpsLovers/gitpaas/commit/547bd59b9cc62bf3b33e9232d07153a7fbc7a7cc))
* add ESLint ([f6b3e6e](https://github.com/GitOpsLovers/gitpaas/commit/f6b3e6ee0716b095ca4b0279767edc13785f9b4d))
* add form UI components ([386cd2d](https://github.com/GitOpsLovers/gitpaas/commit/386cd2d4cb4995c6e518c5d9841cd4af44b29c2e))
* add hardening ([c24950b](https://github.com/GitOpsLovers/gitpaas/commit/c24950b70a976dcbdc1ae45267ae6c5bb35a9b7c))
* add health check ([1a75772](https://github.com/GitOpsLovers/gitpaas/commit/1a75772a16789337c36eb2500c3eff2dc8c7fea0))
* add local IaC ([50ea7d7](https://github.com/GitOpsLovers/gitpaas/commit/50ea7d79bc9d75b042ca56c3a6cf00e1bd4c305f))
* add Log streamer ([3d6339b](https://github.com/GitOpsLovers/gitpaas/commit/3d6339b3cf343129d1dcab8acdfe5ff5e92242b9))
* add Logs feature ([c9afb14](https://github.com/GitOpsLovers/gitpaas/commit/c9afb14d7e6acdcb508ee3a4ba9e5a06675ee7e6))
* add networks tab ([e0c6a7d](https://github.com/GitOpsLovers/gitpaas/commit/e0c6a7d0dd0a2638fd13c33bf509f93f30c27e20))
* add one shot installer ([492fc95](https://github.com/GitOpsLovers/gitpaas/commit/492fc9597cc848aca7ea23a143b4cca8b2effe85))
* add ports conventions ([fc8d76a](https://github.com/GitOpsLovers/gitpaas/commit/fc8d76a3dc3b45fb778b7349e9f865aa633293ab))
* add projects feature ([6f0c9e2](https://github.com/GitOpsLovers/gitpaas/commit/6f0c9e25808a37257fb0843b05ccacc2ff71257b))
* add projects list ([38ad475](https://github.com/GitOpsLovers/gitpaas/commit/38ad47540bb91c9eda5fc9b37cdf1f807865de38))
* add providers feature ([3d17cac](https://github.com/GitOpsLovers/gitpaas/commit/3d17cac753c0e90b3cb455b8214ae16597585751))
* add refactorer agent ([6b51430](https://github.com/GitOpsLovers/gitpaas/commit/6b51430487e20f6be40f9bbe42aa07eaa9086eea))
* add server maintenance page ([745a393](https://github.com/GitOpsLovers/gitpaas/commit/745a3936e54acbd453812e1834b9a9a7ebfb85db))
* add service count to projects ([ea7690d](https://github.com/GitOpsLovers/gitpaas/commit/ea7690d3cf49c43b7e8e149d9be9dd7dd9f83df9))
* add service detail page ([8d521e9](https://github.com/GitOpsLovers/gitpaas/commit/8d521e9df2d5e0ac23d33ff21825e47c47953836))
* add services feature ([5a1debb](https://github.com/GitOpsLovers/gitpaas/commit/5a1debb891686327000c7ca714b944618304c10a))
* add subagentes ([b2629a7](https://github.com/GitOpsLovers/gitpaas/commit/b2629a789597f72c96a5815193b582fe5bcbfe3b))
* add tabs navigation ([4532481](https://github.com/GitOpsLovers/gitpaas/commit/453248188e58bbdb14e9dcbf63ccee6c7062885b))
* add TailAdmin to Frontend ([218785b](https://github.com/GitOpsLovers/gitpaas/commit/218785b24fabbf9912b61337eba09cf44b48d69a))
* add tester agent ([e9fe354](https://github.com/GitOpsLovers/gitpaas/commit/e9fe35429cec04e19c84b307850d344fbc8dfcde))
* add tests for main ([daae1fe](https://github.com/GitOpsLovers/gitpaas/commit/daae1fef199e40eabf61565d7ba73fceed722ccc))
* add tests to Core infra ([faa7364](https://github.com/GitOpsLovers/gitpaas/commit/faa7364ee704dcbe070bfbccd437e5c65729d9da))
* add tests to infra layer ([9536826](https://github.com/GitOpsLovers/gitpaas/commit/953682674e4b4ffc9e720d950566eb9720f05152))
* add theme switcher ([c9b603f](https://github.com/GitOpsLovers/gitpaas/commit/c9b603ff09c4de7f814a201bf8b4e0e7755a64db))
* add Toast notifications ([4c10e5b](https://github.com/GitOpsLovers/gitpaas/commit/4c10e5b5f4e600c16ac130b5864fdac67c2c1411))
* add Unit test skill ([6bf3819](https://github.com/GitOpsLovers/gitpaas/commit/6bf3819eac632055ee94e307304390a7bb4eec8a))
* add unit test to services ([0189bbd](https://github.com/GitOpsLovers/gitpaas/commit/0189bbd46d4877d65bb05a1eadca8b6f74d10fea))
* add unit testing skill ([5ffbb87](https://github.com/GitOpsLovers/gitpaas/commit/5ffbb874e90235177b95939c38c17b0a0977a61c))
* add unit tests for controllers ([a7094a3](https://github.com/GitOpsLovers/gitpaas/commit/a7094a370093ee1de674a9d228fd03cabc95e3ba))
* add unit tests to backend use cases ([fe6cbce](https://github.com/GitOpsLovers/gitpaas/commit/fe6cbce9fd48e13396358ca29552897589a66ae2))
* align naming in the  feature ([059ea54](https://github.com/GitOpsLovers/gitpaas/commit/059ea54e8aa0ac385b7cb53fe719d2cf46edf9eb))
* apply conventions to models and ports ([298aa73](https://github.com/GitOpsLovers/gitpaas/commit/298aa73a37d2188b80cb5c4c7b32f9ff4f79cb40))
* apply conventions to repositories ([983dd86](https://github.com/GitOpsLovers/gitpaas/commit/983dd864f84422f1b00826c9d2b9ce27a86e6dff))
* **auth:** add JWT + Passport authentication with refresh token rotation ([#9](https://github.com/GitOpsLovers/gitpaas/issues/9)) ([aa000c7](https://github.com/GitOpsLovers/gitpaas/commit/aa000c71ce52cf12a4aeedc3e1187d535901c7c6))
* **auth:** add login page and client-side authentication ([#10](https://github.com/GitOpsLovers/gitpaas/issues/10)) ([7506e67](https://github.com/GitOpsLovers/gitpaas/commit/7506e67960f738fbc1b86811fc190db05f40f25f))
* **backend:** add actor and business context to wide event ([#51](https://github.com/GitOpsLovers/gitpaas/issues/51)) ([b193cfe](https://github.com/GitOpsLovers/gitpaas/commit/b193cfec385265a43ef767c70aa1a01f63c0077e))
* **backend:** add telemetry counters for outbound calls ([#54](https://github.com/GitOpsLovers/gitpaas/issues/54)) ([c2a29e0](https://github.com/GitOpsLovers/gitpaas/commit/c2a29e0e3febcf6dc70a32d790886df857e70897))
* **backend:** add telemetry tail sampling policy ([#56](https://github.com/GitOpsLovers/gitpaas/issues/56)) ([e2d761a](https://github.com/GitOpsLovers/gitpaas/commit/e2d761a3e641359e96ca184438628cf44b2032dc))
* **backend:** add telemetry to the deployment queue runner ([#55](https://github.com/GitOpsLovers/gitpaas/issues/55)) ([d6a0803](https://github.com/GitOpsLovers/gitpaas/commit/d6a0803f70a2baea3cefcaa16b63d4b47f404d16))
* **backend:** add wide event logging rails ([#50](https://github.com/GitOpsLovers/gitpaas/issues/50)) ([19aa4ed](https://github.com/GitOpsLovers/gitpaas/commit/19aa4edb1b7f6d5883b19b71047226c7e93af68a))
* **backend:** cap telemetry error.stack length ([#58](https://github.com/GitOpsLovers/gitpaas/issues/58)) ([322d3aa](https://github.com/GitOpsLovers/gitpaas/commit/322d3aa9d2981b26a85056ceb65890d84e97930a))
* **backend:** complete structured telemetry coverage ([#59](https://github.com/GitOpsLovers/gitpaas/issues/59)) ([912b6ac](https://github.com/GitOpsLovers/gitpaas/commit/912b6acdc408b444f6c399b005e0a4641ebf3b39))
* **backend:** converge error logging into wide event ([#52](https://github.com/GitOpsLovers/gitpaas/issues/52)) ([7869f55](https://github.com/GitOpsLovers/gitpaas/commit/7869f55ed886660e8436417d0e2edabf9f9d4b6a))
* **backend:** introduce TypeORM migrations and drop prod synchronize ([#15](https://github.com/GitOpsLovers/gitpaas/issues/15)) ([b15af61](https://github.com/GitOpsLovers/gitpaas/commit/b15af61f49086b5887150850bb4174a8ad68bdbf))
* **backend:** redis streams log store ([#46](https://github.com/GitOpsLovers/gitpaas/issues/46)) ([cfe841a](https://github.com/GitOpsLovers/gitpaas/commit/cfe841a0928479fba67621565907ced7f0930182))
* **backend:** resolve telemetry service.version from manifest ([#57](https://github.com/GitOpsLovers/gitpaas/issues/57)) ([ee66ece](https://github.com/GitOpsLovers/gitpaas/commit/ee66ece5525b45280452707b137af0966cb6ec9b))
* **backend:** unify logging behind AppLogger port ([#38](https://github.com/GitOpsLovers/gitpaas/issues/38)) ([e815b27](https://github.com/GitOpsLovers/gitpaas/commit/e815b27812587254e77c7f2a72272ac3fb8757f2))
* centraliza labels ([c75d6c5](https://github.com/GitOpsLovers/gitpaas/commit/c75d6c5b786543563594e778d8006fd17c59f093))
* centralize server status functions ([bcbbbce](https://github.com/GitOpsLovers/gitpaas/commit/bcbbbce7f5ec68289d18e224aa62e81b70b07567))
* change deployment logs system ([#37](https://github.com/GitOpsLovers/gitpaas/issues/37)) ([dda3c2f](https://github.com/GitOpsLovers/gitpaas/commit/dda3c2f99aafc9b84741279345feaa7eb0f8e850))
* change to main agent orchestrator ([d018ca5](https://github.com/GitOpsLovers/gitpaas/commit/d018ca51e5e70c10a1bf912ad36cee2ef1e4d846))
* change vps concept by server ([a386fc1](https://github.com/GitOpsLovers/gitpaas/commit/a386fc1c10eb8b7ead1f0aac01823bc51d9e9717))
* clean orphan docker resources ([96283e3](https://github.com/GitOpsLovers/gitpaas/commit/96283e3d05fffde3ecf5a8a0310383bad0205a28))
* create providers table ([35c21ed](https://github.com/GitOpsLovers/gitpaas/commit/35c21edcccb173b3f67fb046f85828eab9434a9b))
* delete deployment logs ([e27ed3d](https://github.com/GitOpsLovers/gitpaas/commit/e27ed3de6e8ae16decc93f929a58e7252b948f19))
* deploy from local Dockerfiles ([afd0fc8](https://github.com/GitOpsLovers/gitpaas/commit/afd0fc8d573e2cb92d1e7898188b40985f62b2ef))
* **deployments:** persist deployment queue in the database ([#7](https://github.com/GitOpsLovers/gitpaas/issues/7)) ([f031b0e](https://github.com/GitOpsLovers/gitpaas/commit/f031b0efd8fe7746ec02b8c9a9673986879f513e))
* derivate create deployments to use case ([c06379c](https://github.com/GitOpsLovers/gitpaas/commit/c06379c1336ca8a78f47a6a4d76dda6b3948fc6c))
* derivate Docker logic to features ([41c9724](https://github.com/GitOpsLovers/gitpaas/commit/41c97242afae2b8c753b2c170b77945028e3bd68))
* **docker:** run on the local Docker socket, drop remote daemon ([#33](https://github.com/GitOpsLovers/gitpaas/issues/33)) ([7848fed](https://github.com/GitOpsLovers/gitpaas/commit/7848fed66494a42d9c6fa78abb1815f4d1ebf721))
* finish Backend linting ([67a0da9](https://github.com/GitOpsLovers/gitpaas/commit/67a0da9e675929701d2573faa49ea23c642c1b64))
* fix JSDoc placement on decorated classes project-wide ([04becdc](https://github.com/GitOpsLovers/gitpaas/commit/04becdc8bda260dc10f6e2839109e878523e2ba8))
* **frontend:** env-driven API base and token-capable SSE log client ([#16](https://github.com/GitOpsLovers/gitpaas/issues/16)) ([06a13c3](https://github.com/GitOpsLovers/gitpaas/commit/06a13c376c4709d6e33cb64f133908bd6397aceb))
* improve breadcrumb levels ([6f81bb1](https://github.com/GitOpsLovers/gitpaas/commit/6f81bb1b528a71a2720bdd38b0ce597586e2f590))
* improve deployment logs ([4ba2f45](https://github.com/GitOpsLovers/gitpaas/commit/4ba2f4501816267826005b0cd0f3fa81488e465f))
* improve deployments list UI ([1ca3603](https://github.com/GitOpsLovers/gitpaas/commit/1ca3603cd6fde7f4965f6360a2b4fe3f3e812c7d))
* improve deployments list UI ([bd0818b](https://github.com/GitOpsLovers/gitpaas/commit/bd0818b3793314b6c0792b1d0d690023d4e194a0))
* improve sidebar ([f6e2b7b](https://github.com/GitOpsLovers/gitpaas/commit/f6e2b7b37ee596da25a6b334fedb02a8d31a9747))
* **infra:** add production Dockerfiles and compose stack ([#13](https://github.com/GitOpsLovers/gitpaas/issues/13)) ([08c167f](https://github.com/GitOpsLovers/gitpaas/commit/08c167f58a9bef4e52ac198cdd2594ba19de8287))
* launch applications ([3bbe55b](https://github.com/GitOpsLovers/gitpaas/commit/3bbe55be3dba80a6bc3082bb08a4fdde32d04c9d))
* lint filters ([e6a3247](https://github.com/GitOpsLovers/gitpaas/commit/e6a32473659364e621e6edbe1fd25beb97056bbc))
* move computed data off the persistence entity ([523502e](https://github.com/GitOpsLovers/gitpaas/commit/523502ed77fc0b15bdb9f13fa4877e18ac0e8d72))
* move Password hasher to Shared ([4b1db7b](https://github.com/GitOpsLovers/gitpaas/commit/4b1db7bf9d43fead8acb4a0f6ac54cb23f23182d))
* move some models to Dtos in Core ([bf3f42e](https://github.com/GitOpsLovers/gitpaas/commit/bf3f42e90339d2bcfbb6e4b68a09f81dc0b261cd))
* normalize the  domain shape ([b63b851](https://github.com/GitOpsLovers/gitpaas/commit/b63b851a9adac222262b0fec5c12d9ef3c43fb9f))
* partialize DockerServiceRuntimeResourcesAdapter in several methods ([1ef9eb6](https://github.com/GitOpsLovers/gitpaas/commit/1ef9eb6969c6806f39b308fba665267b35587a67))
* pass unified properties to service provider ([619ab15](https://github.com/GitOpsLovers/gitpaas/commit/619ab15efe56f6e40ee992fb38eaa12650f80ffe))
* reestructute Core module ([e4ca529](https://github.com/GitOpsLovers/gitpaas/commit/e4ca5297cc6e7e73b264adb38c7cbd04184f7b5d))
* refactor API repositories ([602c776](https://github.com/GitOpsLovers/gitpaas/commit/602c77601c3fc87a4daa340a16b321f99dcd23ce))
* rename event bus to queue ([ab39f3a](https://github.com/GitOpsLovers/gitpaas/commit/ab39f3af4b8905638c641723b6b3c8077c6c7593))
* rename ports and models ([5ef3d58](https://github.com/GitOpsLovers/gitpaas/commit/5ef3d5841323be2c9eb969c4aa24e4c769afd2c0))
* rewrite documentation ([0efe15f](https://github.com/GitOpsLovers/gitpaas/commit/0efe15fbba0874538301983b54b9b26c123f8faf))
* **server:** add readiness health check probing dependencies ([#3](https://github.com/GitOpsLovers/gitpaas/issues/3)) ([c6360a8](https://github.com/GitOpsLovers/gitpaas/commit/c6360a8c8241c2827aa5efbf5bd0af237c1ca3e3))
* standarize Core code ([fbcad1a](https://github.com/GitOpsLovers/gitpaas/commit/fbcad1a41c79ec8859df4db1560e23db1c644891))
* standarize database entities ([9ec256a](https://github.com/GitOpsLovers/gitpaas/commit/9ec256a4c7e1826ac0919243c0b8f1b321ee28a0))
* standarize naming ([a1a96bf](https://github.com/GitOpsLovers/gitpaas/commit/a1a96bfffd27beff81971fb56ada9aeb39e0705f))
* standrize ports and adapters ([896449c](https://github.com/GitOpsLovers/gitpaas/commit/896449cece97683ef177d4653c0e294be60e039d))
* update dependencies ([#8](https://github.com/GitOpsLovers/gitpaas/issues/8)) ([4723054](https://github.com/GitOpsLovers/gitpaas/commit/4723054fbf6430c3df12e791f9bcc259a828e575))

### Bug Fixes

* **backend:** map projects repository write path to domain ([#39](https://github.com/GitOpsLovers/gitpaas/issues/39)) ([a7622d2](https://github.com/GitOpsLovers/gitpaas/commit/a7622d2b51e2f0388d0b3488b984730799a87009))
* **backend:** overhaul error handling ([#49](https://github.com/GitOpsLovers/gitpaas/issues/49)) ([c4cc8a3](https://github.com/GitOpsLovers/gitpaas/commit/c4cc8a3c0a3241808a8157cbcc19a36cb603b938))
* **backend:** require all env vars and fail-fast at boot ([#4](https://github.com/GitOpsLovers/gitpaas/issues/4)) ([83157ad](https://github.com/GitOpsLovers/gitpaas/commit/83157ad639fb42c1058abc21369ae7672598da6d))
* **backend:** use named wildcard for middleware route path ([#60](https://github.com/GitOpsLovers/gitpaas/issues/60)) ([ff9d230](https://github.com/GitOpsLovers/gitpaas/commit/ff9d230e06c7f94a9977cec87ee50d4e813659c5))
* **deployments:** serialize concurrent deployments per compose project ([#5](https://github.com/GitOpsLovers/gitpaas/issues/5)) ([4817c12](https://github.com/GitOpsLovers/gitpaas/commit/4817c124b94d90ae68163a1e2f3eac13a4aec84e))
* **docker:** scope Docker operations to GitPaaS resources ([#34](https://github.com/GitOpsLovers/gitpaas/issues/34)) ([0f40008](https://github.com/GitOpsLovers/gitpaas/commit/0f4000813062372e057973cc348daf6d718c0c88))
* **services:** purge external state after DB delete ([#2](https://github.com/GitOpsLovers/gitpaas/issues/2)) ([8022e72](https://github.com/GitOpsLovers/gitpaas/commit/8022e72720a14ea1b5f8e2f31eccc3d01cb894a7))
* write CHANGELOG en release ([ecb8eb0](https://github.com/GitOpsLovers/gitpaas/commit/ecb8eb0066e391b67c169616d45f3228aa97787a))
