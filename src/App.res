open Tea.App
open Tea.Html

type state = {
  substrate: array<int>,
  headPosition: int,
  isStriking: bool,
}

type action =
  | SetSubstrate(array<int>)
  | StepHead
  | ExecuteStrike

let init = () => ({substrate: [], headPosition: 0, isStriking: false}, Tea.Cmd.none)

let update = (model, action) => {
  match action {
  | SetSubstrate(bytes) => ({...model, substrate: bytes}, Tea.Cmd.none)
  | StepHead => ({...model, headPosition: model.headPosition + 1}, Tea.Cmd.none)
  | ExecuteStrike => 
      // Bridge to Tauri FFI
      Bindings.strike(model.substrate)
      (model, Tea.Cmd.none)
  }
}

let view = (model) => {
  div([class("dot-matrix-ui")], [
    h1([], [text("DotMatrix-FilePrinter")]),
    div([class("grid")], [
      model.substrate->Array.mapWithIndex((byte, i) => {
        let active = i == model.headPosition ? "active" : ""
        span([class(active)], [text(byte->Int.toString)])
      })->Array.toArray->span([], _)
    ]),
    button([onClick(ExecuteStrike)], [text("STRIKE SUBSTRATE")])
  ])
}
