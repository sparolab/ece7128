# ECE7128 · 공간지능특론

SPARO Lab 공간지능특론의 논문 리스트와 팀 프로젝트 페이지입니다.

## 동작

1. 학생이 페이지 안에서 논문 제목, 학회, 연도, 연구 주제, 링크와 수업 등록 코드를 입력합니다.
2. 등록 서버가 입력을 검증하고 이 저장소의 `data/submissions.json`만 갱신합니다.
3. 등록한 학생의 화면에는 바로 반영됩니다. 다른 방문자는 등록 서버에서 최신 목록을 읽습니다.
4. 목록 변경 커밋마다 정적 사본도 자동으로 다시 배포합니다.

PDF나 첨부 파일을 업로드하지 않습니다. 학생에게 GitHub 계정·조직 가입·저장소 쓰기 권한을 요구하지 않습니다. 커밋은 서버에 연결한 인증 계정으로 기록되며 학생을 커밋 작성자로 지정하지 않습니다.

## 구성

- 기본 논문 340편과 기존 검색·양식 화면.
- `server/handler.mjs`: 서버 전용 GitHub 기록 처리기. 저장소와 파일 경로를 코드에서 고정합니다.
- 중복 제목 방지, 동시 수정 충돌 재시도, 입력 길이·URL 검증, 수업 등록 코드 확인.
- 팀 등록 화면도 유지하며, 수정 키는 등록 브라우저에 보관합니다. 공개 데이터에는 키 원문을 넣지 않습니다. 브라우저 저장소를 지우면 담당자를 통해 수정해야 합니다.
- `npm test`: 모의 GitHub API 검증. 실제 GitHub에 테스트 데이터를 올리지 않습니다.
- `npm run build`: GitHub Pages용 `_site/` 생성.

**GitHub Pages 공개와 기존 Sites 서버 배포를 완료했습니다. 저장소 전용 인증키 발급·연결이 남아 있습니다.** 서버가 응답하기 전에는 정적 목록을 표시하고 등록 버튼을 비활성화합니다. `COURSE_PAGES_ENABLED=true`로 자동 배포를 켰습니다.

## 운영 연결

1. 기존 Sites 서버에 `server/handler.mjs`와 `server/sites-route.ts.example` 어댑터를 `/api/course-registry`로 연결합니다. 새 서비스 생성은 필요하지 않습니다. 공개 접근 전환은 승인되었습니다.
2. 서버 비밀 설정에 `GITHUB_CONTENTS_TOKEN`을 저장합니다. `sparolab/ece7128` 하나만 대상으로 한 fine-grained token, Contents read/write만 부여합니다. Workflows, Administration, 조직 전체 권한은 부여하지 않습니다. 토큰은 브라우저 코드·GitHub 저장소·채팅에 붙여넣지 않습니다.
3. `COURSE_SUBMISSION_CODE`를 서버 비밀 설정에 저장하고 수업 안에서만 안내합니다. GitHub 인증정보와는 별개입니다.
4. `site/config.js`에 승인된 서버 주소를 지정합니다. 이 파일에는 비밀 값을 넣지 않습니다.
5. 이 저장소에서 GitHub Pages의 GitHub Actions 배포를 활성화한 뒤 `COURSE_PAGES_ENABLED=true`를 설정합니다.
6. 배포와 실제 기록 동작을 검증합니다. 공개 주소는 `https://sparolab.github.io/ece7128/`입니다.

연구실 홈페이지 저장소는 수정하지 않으며 연결 메뉴도 추가하지 않습니다.

## 로컬 검증

`npm test && npm run build` 후 `node scripts/preview.mjs`를 실행합니다. 출력된 로컬 주소에서 테스트 코드 `preview-only`로 입력 흐름을 검증할 수 있습니다. 데이터는 메모리에만 저장되며 서버 종료 시 사라집니다. 이 코드는 운영 인증정보가 아닙니다.

## 참고

- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
