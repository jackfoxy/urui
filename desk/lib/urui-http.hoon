::  urui-http: eyre response helpers shared by consuming agents.
::
::  Keeps every route string, header name, and status code in the
::  consumer; urui owns only the shape of the reply.
::
::  Phase 3 (W3.2) fills these arms.
::
|%
::
++  respond
  ::  One complete http reply.
  ::
  |=  [status=@ud =mime]
  ^-  simple-payload:http
  [[status ~] `q.mime]
::
++  asset-route
  ::  Match a request url against an application's asset table.
  ::
  |=  [base=@t url=@t assets=(list [suffix=@t =mime])]
  ^-  (unit mime)
  ~
::
++  require-auth
  ::  Gate a request on eyre's authentication flag.
  ::
  |=  [authenticated=? payload=simple-payload:http]
  ^-  simple-payload:http
  ?:  authenticated  payload
  [[403 ~] ~]
--
