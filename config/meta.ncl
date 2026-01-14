# Nickel Symbolic Contract
# Enforces the physical limitations of the 24-pin striker

let Constraints = {
  max_byte = 127,
  forbidden = [160, 194],
  line_ending = 10,
  space = 32,
} in

{
  metadata = {
    name = "Substrate-Alpha",
    version = "1.0.0",
    description = "Deterministic byte-injection via Forth stack",
  },

  # Forth Data Generation
  forth_data = fun bytes => 
    "CREATE STRIKE-DATA " 
    + (std.string.join " , " (std.array.map std.string.from_number bytes)) 
    + " ,",

  rules = Constraints,
}
