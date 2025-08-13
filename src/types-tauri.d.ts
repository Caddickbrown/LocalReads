declare module '@tauri-apps/plugin-dialog' {
  export function save(options?: any): Promise<string | null>
  export function open(options?: any): Promise<string | string[] | null>
}

declare module '@tauri-apps/plugin-fs' {
  export function readTextFile(path: string): Promise<string>
  export function writeTextFile(path: string, contents: string): Promise<void>
}


