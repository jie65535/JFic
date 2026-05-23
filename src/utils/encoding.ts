/**
 * 上传文件编码检测与转换为 UTF-8 字符串。
 *
 * 策略:
 * 1. 先尝试 UTF-8 严格解码(fatal: true)，若成功直接返回
 * 2. 失败则按常见中文编码 GBK / GB18030 尝试
 * 3. 都不行则回退到 UTF-8 容错模式(替换字符)
 */
export async function decodeFileSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer()

  // 去掉 UTF-8 BOM
  let bytes = new Uint8Array(buf)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    bytes = bytes.slice(3)
  }

  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true })
    return utf8.decode(bytes)
  } catch {
    // 尝试 GBK / GB18030
    for (const enc of ['gb18030', 'gbk', 'big5']) {
      try {
        const dec = new TextDecoder(enc, { fatal: true })
        return dec.decode(bytes)
      } catch {
        // 继续尝试
      }
    }
    // 都失败,回退为 UTF-8 容错
    return new TextDecoder('utf-8').decode(bytes)
  }
}
