::  Tests for /lib/urui-css.
::
::  The sections are empty until W3.3, so these arms pin the only behavior
::  that exists: composition is a pure concatenation in the order given and
::  never crashes.  W3.3 replaces them with order and token assertions —
::  the section list is a `$?` mold, so an unknown name is a build failure
::  rather than something to test for at runtime.
::
/+  *test, ucss=urui-css
|%
::
++  test-compose-of-nothing-is-empty
  (expect-eq !>('') !>((compose:ucss ~)))
::
++  test-compose-of-every-section-is-empty-today
  =/  all=(list section:ucss)
    :~  %tokens  %shell  %explorer  %tabs
        %dialogs  %controls  %responsive
    ==
  ;:  weld
    (expect-eq !>('') !>((compose:ucss all)))
    ::  concatenation, not a join: no separator is introduced
    (expect-eq !>((compose:ucss all)) !>((compose:ucss (weld all all))))
  ==
--
