::  Tests for /app/urui-fixture.
::
::  The agent integration half of urui's harness: the shell is exercised
::  through a real Gall agent in a mock bowl, so a page that only renders
::  in `vere eval` cannot pass.
::
/+  *test
/=  agent  /app/urui-fixture
|%
::
++  bol
  ^-  bowl:gall
  %*  .  *bowl:gall
    our  ~zod
    src  ~zod
    dap  %urui-fixture
    byk  [~zod %urui-fixture %da ~2000.1.1]
  ==
::
++  request
  |=  [method=method:http url=@t body=(unit octs)]
  ^-  inbound-request:eyre
  %*  .  *inbound-request:eyre
    authenticated  %.y
    request
      %*  .  *request:http
        method  method
        url     url
        body    body
      ==
  ==
::
++  poke-http
  |=  req=inbound-request:eyre
  %-  on-poke:~(. agent bol)
  [%handle-http-request !>(['request' req])]
::
++  response-status
  |=  cards=(list card:agent:gall)
  ^-  @ud
  ?>  ?=(^ cards)
  =/  card  i.cards
  ?>  ?=(%give -.card)
  =/  gift  p.card
  ?>  ?=(%fact -.gift)
  ?>  =(%http-response-header p.cage.gift)
  status-code:!<(response-header:http q.cage.gift)
::
++  response-body
  |=  cards=(list card:agent:gall)
  ^-  @t
  ?>  ?=(^ cards)
  =/  rest  t.cards
  ?>  ?=(^ rest)
  =/  card  i.rest
  ?>  ?=(%give -.card)
  =/  gift  p.card
  ?>  ?=(%fact -.gift)
  ?>  =(%http-response-data p.cage.gift)
  =/  data  !<((unit octs) q.cage.gift)
  ?~  data  ''
  (crip (trip q.u.data))
::
++  test-page-serves-three-areas
  =/  cards  -:(poke-http (request %'GET' '/apps/urui-fixture' ~))
  =/  body  (response-body cards)
  ;:  weld
    (expect-eq !>(200) !>((response-status cards)))
    (expect !>(?=(^ (find "id=\"explorer\"" (trip body)))))
    (expect !>(?=(^ (find "id=\"editor-pane\"" (trip body)))))
    (expect !>(?=(^ (find "id=\"result-pane\"" (trip body)))))
  ==
::
++  test-page-areas-carry-roles
  =/  cards  -:(poke-http (request %'GET' '/apps/urui-fixture' ~))
  =/  body  (response-body cards)
  ;:  weld
    (expect !>(?=(^ (find "data-role=\"reference\"" (trip body)))))
    (expect !>(?=(^ (find "data-role=\"editor\"" (trip body)))))
    (expect !>(?=(^ (find "data-role=\"result\"" (trip body)))))
  ==
::
++  test-assets-answer-with-their-own-types
  =/  js  (poke-http (request %'GET' '/apps/urui-fixture/app.js' ~))
  =/  css  (poke-http (request %'GET' '/apps/urui-fixture/app.css' ~))
  =/  ace  (poke-http (request %'GET' '/apps/urui-fixture/ace/ace.js' ~))
  =/  theme
    (poke-http (request %'GET' '/apps/urui-fixture/ace/theme-github.js' ~))
  ;:  weld
    (expect-eq !>(200) !>((response-status -.js)))
    (expect-eq !>(200) !>((response-status -.css)))
    (expect-eq !>(200) !>((response-status -.ace)))
    (expect-eq !>(200) !>((response-status -.theme)))
  ==
::
++  test-unauthenticated-request-is-refused
  =/  req  (request %'GET' '/apps/urui-fixture' ~)
  =/  cards  -:(poke-http req(authenticated %.n))
  (expect-eq !>(403) !>((response-status cards)))
::
++  test-ace-config-is-generated
  =/  req  (request %'GET' '/apps/urui-fixture/ace/config.js' ~)
  =/  cards  -:(poke-http req)
  =/  body  (trip (response-body cards))
  ;:  weld
    (expect-eq !>(200) !>((response-status cards)))
    (expect !>(?=(^ (find "uruiFixtureAceAssets" body))))
    (expect !>(?=(^ (find "ace/mode/text" body))))
  ==
::
++  test-echo-returns-the-posted-body
  =/  posted  (as-octs:mimes:html 'hello fixture')
  =/  req  (request %'POST' '/apps/urui-fixture/echo' `posted)
  =/  body  (response-body -:(poke-http req))
  ;:  weld
    (expect !>(?=(^ (find "<pre class=\"echo\">" (trip body)))))
    (expect !>(?=(^ (find "hello fixture" (trip body)))))
  ==
::
++  test-unknown-route-is-not-found
  =/  cards  -:(poke-http (request %'GET' '/apps/urui-fixture/nope' ~))
  (expect-eq !>(404) !>((response-status cards)))
--
