use std::process::Command;
use std::io::Write;

#[tauri::command]
fn execute_forth_strike(bytes: Vec<u8>, path: String) -> Result<(), String> {
    // Write data to temporary Forth source
    let mut f = std::fs::File::create("kernel/data.fth").unwrap();
    write!(f, "CREATE STRIKE-DATA ").unwrap();
    for b in &bytes { write!(f, "{} , ", b).unwrap(); }
    write!(f, " \n").unwrap();

    // Invoke Gforth Kernel
    let status = Command::new("gforth")
        .args([
            "kernel/striker.fth",
            "kernel/data.fth",
            "-e",
            &format!("s\" {}\" strike-init STRIKE-DATA {} strike-sequence strike-close bye", 
                     path, bytes.len())
        ])
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() { Ok(()) } else { Err("Physical Strike Failed".into()) }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![execute_forth_strike])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
