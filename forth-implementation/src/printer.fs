( --- Dot Matrix Byte-Level Printer --- )

: .pixel ( char -- )
  dup 128 and if ." #" else ."  " then
  drop ;

: .row ( byte -- )
  8 0 do
    dup i lshift 128 and if [char] # emit else [char] . emit then
  loop drop cr ;

: print-char ( addr -- )
  8 0 do
    dup i + c@ .row
  loop drop ;

( Define the letter A in memory )
create char-a 0x18 c, 0x3C c, 0x66 c, 0x66 c, 0x7E c, 0x66 c, 0x66 c, 0x00 c,

: run-printer
  cr ." Printing 'A' at byte-level:" cr
  char-a print-char ;

run-printer bye
