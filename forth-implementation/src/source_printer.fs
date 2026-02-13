( --- Byte-Level Source Code Printer --- )
decimal

( Define the raw ASCII values for the Nickel file )
create ncl-data
  108 c, 101 c, 116 c, 32 c, 109 c, 101 c, 116 c, 97 c, 100 c, 97 c, 116 c, 97 c, 32 c, 61 c, 32 c, 123 c, 10 c, ( let metadata = { \n )
  32 c, 32 c, 110 c, 97 c, 109 c, 101 c, 32 c, 61 c, 32 c, 34 c, 77 c, 121 c, 32 c, 83 c, 99 c, 114 c, 105 c, 112 c, 116 c, 34 c, 44 c, 10 c, ( name = "My Script", \n )
  32 c, 32 c, 118 c, 101 c, 114 c, 115 c, 105 c, 111 c, 110 c, 32 c, 61 c, 32 c, 34 c, 48 c, 46 c, 49 c, 46 c, 48 c, 34 c, 44 c, 10 c, ( version = "0.1.0", \n )
  32 c, 32 c, 109 c, 97 c, 116 c, 99 c, 104 c, 32 c, 61 c, 32 c, 91 c, 34 c, 42 c, 58 c, 47 c, 47 c, 42 c, 34 c, 93 c, 44 c, 10 c, ( match = ["*://*"], \n )
  32 c, 32 c, 103 c, 114 c, 97 c, 110 c, 116 c, 32 c, 61 c, 32 c, 91 c, 93 c, 10 c, ( grant = [] \n )
  125 c, 10 c, ( } \n )

ncl-data 88 ( length of data ) constant data-len

: print-to-file ( -- )
  s" config/meta.ncl" r/w create-file throw
  dup ncl-data data-len rot write-file throw
  close-file throw ;

: run
  print-to-file
  cr ." File 'config/meta.ncl' printed at byte-level successfully." cr ;

run bye
