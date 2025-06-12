




/* 
#[tauri::command]
fn open_demographics_dialog<R: Runtime>(
    app: tauri::AppHandle<R>, 
    singleton: State<'_, Arc<Mutex<Maxolyzer>>>,
)  {
        let maxolyzer_arc: Arc<Mutex<Maxolyzer>> = Arc::clone(&*singleton); // dereference and clone
        let maxolyzer_guard = maxolyzer_arc.lock().unwrap();
        let html = maxolyzer_guard.do_annotation_qc();
        let encoded_html = urlencoding::encode(&html);
        let data_url = format!("data:text/html,{}", encoded_html);
        let url = Url::parse(&data_url).expect("invalid data URL");
        let option = app.get_webview_window("qc_window");
        if let Some(window) = option {
            let _ = window.set_focus();
        } else {
            WebviewWindowBuilder::new(
                &app,
                "qc_window",
                WebviewUrl::External(url)
            )
            .build()
            .unwrap();
        }
}*/