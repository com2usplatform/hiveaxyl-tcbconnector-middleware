import cloudbase from '@cloudbase/node-sdk';
import type { ReadStream } from 'fs';

/**
 * TCB 스토리지 클라이언트
 *
 * 모듈 레벨에서 초기화해 Cold Start 이후 동일 인스턴스를 재사용합니다.
 * TCB Cloud Function 내부에서 실행 시 secretId/secretKey 없이
 * 함수 자체 권한으로 인증됩니다.
 *
 * 환경 바인딩:
 *   TCB_ENV_ID 가 설정돼 있으면 해당 환경, 없으면 SYMBOL_CURRENT_ENV 로
 *   현재 함수가 실행 중인 환경에 바인딩합니다.
 *
 * keepalive/retries — docdb 와 동일한 안전 재시도 설정(연결 미성립 오류만 재시도.
 * 업로드/삭제 같은 상태 변경도 요청이 서버에 도달하기 전 실패만 재시도되므로 안전).
 */
const app = cloudbase.init({
    env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
    keepalive: true,
    retries: 2,
});

/**
 * 파일 업로드
 *
 * @param cloudPath  스토리지 경로 (예: 'images/profile.jpg')
 * @param content    파일 내용 (Buffer 또는 ReadStream)
 * @returns          TCB fileID
 *
 * @example
 * const fileID = await uploadFile('images/profile.jpg', buffer);
 */
export async function uploadFile(
    cloudPath: string,
    content: Buffer | ReadStream
): Promise<string> {
    const result = await app.uploadFile({ cloudPath, fileContent: content });
    return result.fileID;
}

/**
 * 파일 다운로드
 *
 * @param fileID  TCB fileID
 * @returns       파일 내용 Buffer
 */
export async function downloadFile(fileID: string): Promise<Buffer> {
    const result = await app.downloadFile({ fileID });
    if (!result.fileContent) {
        throw new Error(`파일을 다운로드할 수 없습니다: ${fileID}`);
    }
    return Buffer.isBuffer(result.fileContent)
        ? result.fileContent
        : Buffer.from(result.fileContent);
}

/**
 * 파일 1개 이상 삭제
 *
 * @param fileIDs  삭제할 TCB fileID 배열
 */
export async function deleteFiles(fileIDs: string[]): Promise<void> {
    await app.deleteFile({ fileList: fileIDs });
}

/**
 * 임시 접근 URL 생성
 *
 * @param fileID   TCB fileID
 * @param maxAge   URL 유효 시간 (초, 기본 600)
 * @returns        임시 다운로드 URL
 */
export async function getTempURL(fileID: string, maxAge = 600): Promise<string> {
    const result = await app.getTempFileURL({
        fileList: [{ fileID, maxAge }],
    });
    const file = result.fileList[0];
    if (!file || file.code !== 'SUCCESS') {
        throw new Error(`임시 URL 생성 실패: ${fileID}`);
    }
    return file.tempFileURL;
}

/**
 * 클라이언트 직접 업로드용 메타데이터 조회
 *
 * 클라이언트가 반환된 url/token/authorization 을 사용해
 * COS 에 직접 PUT 요청으로 업로드합니다.
 *
 * @param cloudPath  업로드할 스토리지 경로
 */
export async function getUploadMetadata(cloudPath: string) {
    const result = await app.getUploadMetadata({ cloudPath });
    return result.data;
}
