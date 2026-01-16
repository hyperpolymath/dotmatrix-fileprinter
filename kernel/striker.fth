\ SPDX-License-Identifier: AGPL-3.0-or-later
\ striker.fth - DotMatrix-FilePrinter Forth Kernel
\ The "24-pin print head" for deterministic byte-level filesystem manipulation
\ ============================================================================
\
\ Philosophy: The Physical Byte
\ -----------------------------
\ This kernel treats the filesystem as a physical dot-matrix substrate.
\ Every byte is a mechanical strike - deterministic, irreversible, pure.
\ No encoding abstraction. No Unicode normalization. Just bytes.
\
\ Constraints (from Nickel contract):
\   max_byte    = 127  (ASCII-pure)
\   forbidden   = 160 (NBSP), 194 (UTF-8 continuation marker)
\   line_ending = 10  (LF only, no CRLF drift)
\
\ ============================================================================

\ --- Configuration ---
127 CONSTANT MAX-BYTE          \ ASCII ceiling
160 CONSTANT FORBIDDEN-NBSP    \ The enemy: non-breaking space
194 CONSTANT FORBIDDEN-UTF8    \ UTF-8 continuation byte (often precedes NBSP)

\ --- State ---
VARIABLE file-handle           \ Current output file descriptor
VARIABLE head-position         \ Current "print head" position (for visualization)
VARIABLE strike-count          \ Total bytes struck this session
VARIABLE error-flag            \ Non-zero if contamination detected

\ --- Error Messages ---
: .contamination ( byte pos -- )
    CR ." *** CONTAMINATION DETECTED ***" CR
    ." Position: " . CR
    ." Byte value: " DUP . ." (0x" HEX . DECIMAL ." )" CR
    DUP FORBIDDEN-NBSP = IF
        ." Type: NBSP (Non-Breaking Space)" CR
    THEN
    DUP FORBIDDEN-UTF8 = IF
        ." Type: UTF-8 continuation marker" CR
    THEN
    DUP MAX-BYTE > IF
        ." Type: Non-ASCII byte (exceeds 127)" CR
    THEN
    DROP
    1 error-flag !
;

\ --- Validation ---
: valid-byte? ( byte -- flag )
    DUP MAX-BYTE > IF DROP FALSE EXIT THEN
    DUP FORBIDDEN-NBSP = IF DROP FALSE EXIT THEN
    DUP FORBIDDEN-UTF8 = IF DROP FALSE EXIT THEN
    DROP TRUE
;

: validate-byte ( byte -- byte | abort )
    DUP valid-byte? 0= IF
        DUP head-position @ .contamination
        ." Strike aborted: ASCII-pure constraint violated" CR
        ABORT
    THEN
;

\ --- File Operations ---
: strike-init ( c-addr u -- )
    \ Initialize strike sequence with target file path
    \ c-addr u = filename string
    0 head-position !
    0 strike-count !
    0 error-flag !
    CR ." [STRIKER] Initialized: " 2DUP TYPE CR
    W/O BIN CREATE-FILE THROW
    file-handle !
    ." [STRIKER] Head at position 0" CR
;

: strike-byte ( byte -- )
    \ Strike a single byte to the substrate
    validate-byte
    file-handle @ EMIT-FILE THROW
    1 head-position +!
    1 strike-count +!
;

: strike-sequence ( addr count -- )
    \ Strike a sequence of bytes from memory
    \ addr = address of STRIKE-DATA array
    \ count = number of bytes to strike
    CR ." [STRIKER] Beginning strike sequence..." CR
    ." [STRIKER] Bytes to strike: " DUP . CR
    0 DO
        DUP I CELLS + @      \ Get byte at offset
        DUP 255 AND          \ Mask to byte
        strike-byte
        head-position @ 16 MOD 0= IF
            CR ." [STRIKER] Head position: " head-position @ .
        THEN
    LOOP
    DROP
    CR ." [STRIKER] Strike sequence complete" CR
    ." [STRIKER] Total bytes struck: " strike-count @ . CR
;

: strike-close ( -- )
    \ Finalize and close the substrate
    file-handle @ CLOSE-FILE THROW
    CR ." [STRIKER] Substrate sealed" CR
    error-flag @ IF
        ." [STRIKER] WARNING: Errors occurred during strike" CR
    ELSE
        ." [STRIKER] Status: CLEAN (ASCII-pure)" CR
    THEN
;

\ --- Verification ---
: verify-byte ( byte pos -- )
    \ Check a single byte for contamination (non-destructive)
    SWAP DUP valid-byte? 0= IF
        SWAP .contamination
    ELSE
        2DROP
    THEN
;

\ --- Utility Words ---
: .hex ( n -- )
    \ Print number in hex
    BASE @ SWAP HEX . BASE !
;

: dump-state ( -- )
    \ Debug: show current striker state
    CR ." === STRIKER STATE ===" CR
    ." Head position: " head-position @ . CR
    ." Strike count:  " strike-count @ . CR
    ." Error flag:    " error-flag @ . CR
    ." ======================" CR
;

\ --- Interactive Mode ---
: test-strike ( -- )
    \ Quick test: strike "Hello" to test.bin
    S" test.bin" strike-init
    72 strike-byte   \ H
    101 strike-byte  \ e
    108 strike-byte  \ l
    108 strike-byte  \ l
    111 strike-byte  \ o
    strike-close
    ." Test complete. Check test.bin with: hexdump -C test.bin" CR
;

CR ." [STRIKER] DotMatrix-FilePrinter Forth Kernel loaded" CR
CR ." [STRIKER] Constraints: max_byte=127, forbidden=[160,194]" CR
CR ." [STRIKER] Ready for deterministic byte injection" CR
