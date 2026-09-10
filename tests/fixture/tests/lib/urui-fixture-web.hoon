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
  =/  source  (trip app-js:web)
  ;:  weld
    (expect !>((has "window.urui.editor.adapter" source)))
    (expect !>((has "document.querySelector('#editor')" source)))
    (expect !>((has "document.querySelector('#result-editor')" source)))
    (expect !>((has "fixture.editors = [editor, noteEditor]" source)))
    (expect !>((has "window.__URUI_EDITOR_TEST__ = editor" source)))
    (expect !>((has "window.__URUI_NOTE_EDITOR_TEST__ = noteEditor" source)))
  ==
::
++  test-editor-failure
  =/  source  (trip app-js:web)
  ;:  weld
    (expect !>((has "Source editors unavailable" source)))
    (expect !>((has "failure.hidden = false" source)))
    (expect !>((has "failure.title = String(cause)" source)))
    (expect !>((has "primaryHost.hidden = true" source)))
    (expect !>((has "noteHost.hidden = true" source)))
  ==
--
