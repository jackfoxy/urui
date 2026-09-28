::  Tests for the fixture's browser consumer.
::
/-  urui
/+  *test, web=urui-fixture-web
|%
::
++  has
  |=  [needle=tape source=tape]
  ^-  ?
  ?=(^ (find needle source))
::
++  test-editor-hosts
  =/  html  (trip page:web)
  ;:  weld
    (expect !>((has "id=\"editor\"" html)))
    (expect !>((has "id=\"result-editor\"" html)))
    (expect !>((has "id=\"editor-load-error\"" html)))
    (expect !>((has "role=\"alert\"" html)))
    (expect !>((has "/apps/urui-fixture/ace/ace.js" html)))
    (expect !>((has "/apps/urui-fixture/ace/config.js" html)))
  ==
::
++  test-editor-mounts
  ::  urui mounts both hosts; the fixture binds what it mounted.
  =/  source  (trip app-js:web)
  ;:  weld
    (expect !>((has "docs.editor('text')" source)))
    (expect !>((has "docs.editor('note')" source)))
    (expect !>((has "fixture.editors = [editor, noteEditor]" source)))
    (expect !>((has "window.__URUI_EDITOR_TEST__ = editor" source)))
    (expect !>((has "window.__URUI_NOTE_EDITOR_TEST__ = noteEditor" source)))
    (expect !>(?=(~ (find "window.urui.editor.adapter" source))))
  ==
::
++  test-editor-failure
  ::  Each host's load-error notice is urui's, not the fixture's.
  =/  html  (trip page:web)
  ;:  weld
    (expect !>((has "id=\"result-editor-load-error\"" html)))
    (expect !>((has "Editor unavailable" html)))
    (expect !>(?=(~ (find "Source editors unavailable" (trip app-js:web)))))
  ==
--
