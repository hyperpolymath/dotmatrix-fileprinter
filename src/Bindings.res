/* Bindings to hyperpolymath/rescript-tauri-ffi */
@module("@tauri-apps/api/core")
external invoke: (string, 'a) => promise<'b> = "invoke"

type strikePayload = {
  bytes: array<int>,
  path: string
}

let strike = (bytes: array<int>) => {
  let _ = invoke("execute_forth_strike", {
    bytes: bytes,
    path: "dist/substrate.bin"
  })
}
