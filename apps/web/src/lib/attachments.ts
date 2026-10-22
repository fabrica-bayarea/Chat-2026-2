import type { FileUIPart } from 'ai'

const MB = 1024 * 1024


export const ATTACHMENT_LIMITS = {
    maxFiles: 5,
  maxFileSizeBytes: 10 * MB, 
  maxTotalSizeBytes: 25 * MB, 
    acceptedTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/markdown',
    'text/csv',
    ],
} as const

const EXTENSION_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
}


export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / MB).toFixed(1)} MB`
}


export function getFileExtension(filename: string): string {
    const dot = filename.lastIndexOf('.')
    return dot > 0 ? filename.slice(dot + 1).toUpperCase() : ''
}


export function getMediaType(file: File): string {
    if (file.type) return file.type
    return EXTENSION_TYPES[getFileExtension(file.name).toLowerCase()] ?? ''
}

export function isImage(mediaType: string): boolean {
    return mediaType.startsWith('image/')
}

export type ValidationResult = {
    accepted: File[]
    errors: string[]
}


export function validateFiles(newFiles: File[], currentFiles: File[]): ValidationResult {
    const accepted: File[] = []
    const errors: string[] = []

    let count = currentFiles.length
    let totalSize = currentFiles.reduce((sum, file) => sum + file.size, 0)
    let reportedMaxFiles = false

    const acceptedTypes: readonly string[] = ATTACHMENT_LIMITS.acceptedTypes

    for (const file of newFiles) {
    if (!acceptedTypes.includes(getMediaType(file))) {
        const extension = getFileExtension(file.name).toLowerCase()
        errors.push(`Tipo de arquivo não suportado: ".${extension || 'desconhecido'}".`)
        continue
    }

    if (file.size > ATTACHMENT_LIMITS.maxFileSizeBytes) {
        const limitMb = ATTACHMENT_LIMITS.maxFileSizeBytes / MB
        errors.push(`Arquivo "${file.name}" excede o limite de ${limitMb} MB.`)
        continue
    }   

    if (count >= ATTACHMENT_LIMITS.maxFiles) {
        if (!reportedMaxFiles) {
        errors.push(`Máximo de ${ATTACHMENT_LIMITS.maxFiles} arquivos por mensagem.`)
        reportedMaxFiles = true
        }
        continue
    }

    if (totalSize + file.size > ATTACHMENT_LIMITS.maxTotalSizeBytes) {
        const limitMb = ATTACHMENT_LIMITS.maxTotalSizeBytes / MB
        errors.push(`O total dos anexos excede o limite de ${limitMb} MB.`)
        continue
    }

    accepted.push(file)
    count += 1
    totalSize += file.size
    }

    return { accepted, errors }
}
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
    })
}


export function filesToParts(files: File[]): Promise<FileUIPart[]> {
    return Promise.all(
    files.map(async (file) => ({
        type: 'file' as const,
        mediaType: getMediaType(file),
        filename: file.name,
        url: await fileToDataUrl(file),
    })),
    )
}
export function getDataUrlSize(url: string): number | null {
    const commaIndex = url.indexOf(',')
    if (!url.startsWith('data:') || commaIndex === -1) return null
    const base64 = url.slice(commaIndex + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}