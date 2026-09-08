::  Tests for /lib/urui-http.
::
::  The response shape is a contract with every consuming agent: W3.2
::  rewrites graph-viz's routing table against these arms, and a change
::  here is a change to every consumer's wire behavior.
::
/+  *test, uhttp=urui-http
|%
::
++  body  (as-octs:mimes:html 'hello')
::
++  payload
  ^-  simple-payload:http
  (respond:uhttp 200 [/text/plain body])
::
++  test-respond-carries-the-status
  =/  sent=simple-payload:http  payload
  =/  missing=simple-payload:http  (respond:uhttp 404 [/text/plain body])
  ;:  weld
    (expect-eq !>(200) !>(status-code.response-header.sent))
    (expect-eq !>(404) !>(status-code.response-header.missing))
  ==
::
++  test-respond-carries-the-body-octs
  =/  sent=simple-payload:http  payload
  ;:  weld
    (expect !>(?=(^ data.sent)))
    (expect-eq !>(body) !>((need data.sent)))
  ==
::
++  test-require-auth-refuses-an-unauthenticated-request
  =/  sent=simple-payload:http  payload
  =/  refused=simple-payload:http  (require-auth:uhttp | sent)
  ;:  weld
    (expect-eq !>(403) !>(status-code.response-header.refused))
    ::  no body: a refusal must not leak the payload it was guarding
    (expect-eq !>(~) !>(data.refused))
  ==
::
++  test-require-auth-passes-an-authenticated-request-through
  =/  sent=simple-payload:http  payload
  (expect-eq !>(sent) !>((require-auth:uhttp & sent)))
--
