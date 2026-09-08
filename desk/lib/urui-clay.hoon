::  urui-clay: clay path validation and directory listing.
::
::  Parameterized on the storage root and the allowed extensions, so a
::  consumer supplies only its own root and extension set.
::
::  Phase 3 (W3.1) fills these arms from the extracted helpers.
::
|%
::
++  file-path
  ::  Validate a client-supplied relative path against one root.
  ::
  ::  Returns ~ when the path is empty, absolute-only, or contains a
  ::  `.` or `..` segment.
  |=  [root=path raw=@t exts=(list @ta)]
  ^-  (unit path)
  ~
::
++  browse-path
  ::  Validate a directory path for a browse request.
  ::
  |=  [root=path raw=@t]
  ^-  (unit path)
  ~
::
++  browse-json
  ::  Encode one directory listing as the browse response.
  ::
  |=  [file=? children=(list @ta)]
  ^-  json
  ~
--
