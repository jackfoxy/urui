::  %urui-fixture: the disposable consumer urui tests itself against.
::
::  Not a product.  This agent exists only inside a staged test desk: it
::  binds the fixture's own base path, serves the three assets the shell
::  produces, and answers `echo` — the stand-in for whatever real work a
::  consumer does with the editor's contents.
::
::  It lives outside urui/desk/ on purpose (plan decision 1): urui ships
::  no installable agent, so nothing here can be mistaken for one.
::
/-  urui
/+  default-agent, dbug, server
/+  web=urui-fixture-web
|%
+$  versioned-state  $%(state-0)
+$  state-0  [%0 ~]
+$  card  card:agent:gall
::
++  respond
  |=  [eyre-id=@ta status=@ud content-type=@t body=@t]
  ^-  (list card)
  %+  give-simple-payload:app:server  eyre-id
  ^-  simple-payload:http
  [[status ~[['content-type' content-type]]] `(as-octt:mimes:html (trip body))]
--
%-  agent:dbug
=|  state-0
=*  state  -
^-  agent:gall
|_  =bowl:gall
+*  this     .
    default  ~(. (default-agent this %n) bowl)
::
++  on-init
  ^-  (quip card _this)
  :_  this
  :~  [%pass /eyre/connect %arvo %e %connect `/apps/urui-fixture dap.bowl]
  ==
::
++  on-save
  ^-  vase
  !>(state)
::
++  on-load
  |=  old-vase=vase
  ^-  (quip card _this)
  =/  old  !<(versioned-state old-vase)
  ?-  -.old
      %0
    :_  this(state old)
    :~  [%pass /eyre/connect %arvo %e %connect `/apps/urui-fixture dap.bowl]
    ==
  ==
::
++  on-poke
  |=  [=mark =vase]
  ^-  (quip card _this)
  |^
  ?.  =(%handle-http-request mark)
    (on-poke:default mark vase)
  (handle-http !<([@ta inbound-request:eyre] vase))
  ::
  ++  handle-http
    |=  [eyre-id=@ta req=inbound-request:eyre]
    ^-  (quip card _this)
    =/  raw-url=tape  (trip url.request.req)
    =/  query=(unit @ud)  (find "?" raw-url)
    =/  url=tape  ?~(query raw-url (scag u.query raw-url))
    =/  method  method.request.req
    ?.  authenticated.req
      :_  this
      (respond eyre-id 403 'text/plain; charset=utf-8' 'forbidden')
    =/  root=?
      ?|  =("/apps/urui-fixture" url)
          =("/apps/urui-fixture/" url)
      ==
    ?:  ?&(=(%'GET' method) root)
      :_  this
      (respond eyre-id 200 'text/html; charset=utf-8' page:web)
    ?:  ?&(=(%'GET' method) =("/apps/urui-fixture/app.js" url))
      :_  this
      (respond eyre-id 200 'text/javascript; charset=utf-8' javascript:web)
    ?:  ?&(=(%'GET' method) =("/apps/urui-fixture/app.css" url))
      :_  this
      (respond eyre-id 200 'text/css; charset=utf-8' css:web)
    ?:  ?&(=(%'GET' method) =("/apps/urui-fixture/ace/config.js" url))
      :_  this
      (respond eyre-id 200 'text/javascript; charset=utf-8' ace-config-js:web)
    ?:  ?&(=(%'POST' method) =("/apps/urui-fixture/echo" url))
      ::  the render stand-in: hand the posted bytes back as a document
      =/  posted=tape
        ?~  body.request.req  ""
        (trip q.u.body.request.req)
      =/  doc=manx  ;pre.echo:"{posted}"
      :_  this
      %-  respond
      :*  eyre-id
          200
          'text/html; charset=utf-8'
          (crip (en-xml:html doc))
      ==
    :_  this
    (respond eyre-id 404 'text/plain; charset=utf-8' 'not found')
  --
::
++  on-watch
  |=  =path
  ^-  (quip card _this)
  ?:  ?=([%http-response *] path)  `this
  (on-watch:default path)
::
++  on-arvo
  |=  [=wire =sign-arvo]
  ^-  (quip card _this)
  ?:  ?=([%eyre %connect *] wire)  `this
  (on-arvo:default wire sign-arvo)
::
++  on-peek   on-peek:default
++  on-leave  on-leave:default
++  on-agent  on-agent:default
++  on-fail   on-fail:default
--
