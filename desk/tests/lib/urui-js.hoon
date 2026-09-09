::  Tests for /lib/urui-js.
::
/+  *test, ujs=urui-js
|%
::
++  test-public-api
  =/  source  (trip core:ujs)
  =/  needles=(list @t)
    :~  'window.urui = Object.freeze(api)'
        'boot(next = {})'
        'status: (...args)'
        '\27create\27, \27close\27, \27select\27'
        '\27update\27, \27list\27, \27active\27'
        '\27primary\27, \27secondary\27'
        '\27show\27, \27refreshTree\27, \27addRef\27, \27openDocs\27'
        '\27save\27, \27queue\27, \27get\27, \27set\27'
        '\27browse\27, \27load\27, \27save\27, \27delete\27'
        '\27paneWidth\27, \27explorerWidth\27'
        '\27show\27, \27clear\27'
    ==
  %-  zing
  %+  turn  needles
  |=  needle=@t
  (expect !>(?=(^ (find (trip needle) source))))
::
++  test-boot-contract
  =/  source  (trip core:ujs)
  ;:  weld
    (expect !>(?=(^ (find "let booted = false" source))))
    (expect !>(?=(^ (find "urui.boot called more than once" source))))
    (expect !>(?=(^ (find "invoke(null, 'onReady', [api])" source))))
    (expect !>(?=(^ (find "return target(...args)" source))))
  ==
::
++  test-editor-adapter
  =/  source  (trip editor-adapter:ujs)
  ;:  weld
    (expect !>(?=(^ (find "const assets = options.assets" source))))
    (expect !>(?=(^ (find "session.setMode(options.mode" source))))
    (expect !>(?=(^ (find "setDiagnostic" source))))
    (expect !>(?=(^ (find "onChange(listener)" source))))
    (expect !>(?=(~ (find "graphViz" source))))
    (expect !>(?=(~ (find "GVIZ" source))))
    (expect !>(?=(~ (find "DOT" source))))
  ==
::
++  test-theme-bootstrap
  =/  source  (trip (theme-bootstrap:ujs 'probe-key' 7))
  ;:  weld
    (expect !>(?=(^ (find "probe-key" source))))
    (expect !>(?=(^ (find "===7" source))))
    (expect !>(?=(^ (find "root.dataset.effectiveTheme" source))))
  ==
--
