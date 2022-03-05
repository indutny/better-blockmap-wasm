use better_blockmap::ChunkerOptions;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Chunker {
    internal: better_blockmap::Chunker,
}

#[wasm_bindgen]
impl Chunker {
    #[wasm_bindgen(constructor)]
    pub fn new(detect_zip_boundary: Option<bool>) -> Self {
        Self {
            internal: better_blockmap::Chunker::new(ChunkerOptions {
                detect_zip_boundary: detect_zip_boundary.unwrap_or(false),
                ..ChunkerOptions::default()
            }),
        }
    }

    pub fn update(&mut self, data: &[u8]) -> Vec<JsValue> {
        self.internal.update(data);
        self.get_chunks()
    }

    pub fn finalize_reset(&mut self) -> Vec<JsValue> {
        let stats = self.internal.finalize_reset();
        let mut js_stats = vec![
            JsValue::from_f64(stats.size as f64),
            JsValue::from_str(&base64::encode(&stats.sha512)),
        ];
        js_stats.append(&mut self.get_chunks());
        js_stats
    }

    fn get_chunks(&mut self) -> Vec<JsValue> {
        let mut result = vec![];
        loop {
            match self.internal.next() {
                None => break,
                Some(chunk) => {
                    result.push(JsValue::from_f64(chunk.size as f64));
                    result.push(JsValue::from_str(&base64::encode(&chunk.digest)));
                }
            }
        }

        result
    }
}
