


use std::{fs, path::PathBuf};

use rfd::FileDialog;


pub fn select_or_create_folder() -> Result<PathBuf, String> {
   match FileDialog::new()
    //.set_directory(default_dir)
    .set_title("Select Output Directory for Phenopackets")
    .pick_folder() {
        Some(pbuf) => Ok(pbuf),
        None => Err("could not retrieve directory".to_string()),
    }
}
