# @maxxuxx/node-printer

[English](README.md)

통합 ESC/POS 영수증 프린터 API입니다

이 패키지는 serial, network, system queue, Bluetooth, CUPS, Windows Spooler 프린터를 하나의 진입점으로 제공합니다

## 사용 스택


| 영역             | 스택                                     |
| -------------- | -------------------------------------- |
| Runtime        | Node.js 20+                            |
| Language       | TypeScript                             |
| Module output  | ESM, CommonJS                          |
| Receipt output | ESC/POS bytes                          |
| Transports     | Network, Serial, System, Bluetooth, CUPS, Windows Spooler |
| Native loading | Lazy import, bundled prebuild          |


## 설치

```bash
npm install @maxxuxx/node-printer
```

## 가능 여부


| 기능                         | 상태    | 설명                               |
| -------------------------- | ----- | -------------------------------- |
| Network TCP 9100           | ✅ 가능  | Windows, macOS, Linux에서 사용 가능    |
| Serial COM 또는 tty          | ✅ 가능  | Windows, macOS, Linux에서 bundled prebuild로 동작 |
| CUPS 출력                    | ✅ 가능  | macOS, Linux에서 사용 가능             |
| Windows Spooler RAW        | ✅ 가능  | Windows에서 bundled prebuild로 동작   |
| System queue               | ✅ 가능  | Windows는 Winspool, macOS/Linux는 CUPS로 자동 연결 |
| Bluetooth SPP              | ✅ 가능  | Serial session을 재사용 |
| Bluetooth 시스템 큐        | ✅ 가능  | Winspool/CUPS를 재사용 |
| Bluetooth LE               | ✅ 어댑터 방식 | 장치별 profile과 `BluetoothBleAdapter` 주입 필요 |
| 프린터 상태 조회             | ✅ 가능  | serial과 network는 ESC/POS, CUPS와 Winspool은 OS spooler 사용 |
| 용지 폭 columns 계산         | ✅ 가능  | 드라이버 너비, 용지 프리셋, 수동 columns 순으로 결정 |
| macOS 또는 Linux Winspool    | ❌ 불가능 | `ERR_UNSUPPORTED_PLATFORM` throw |
| npm install 중 source build | ❌ 미제공 | 배포 패키지는 bundled prebuild를 기대     |


## 빠른 시작

```ts
import { createReceipt, print } from "@maxxuxx/node-printer";

const receipt = createReceipt({ encoding: "cp949" })
  .initialize()
  .text("테스트 출력")
  .divider()
  .text("NETWORK OK")
  .feed(3)
  .cut()
  .encode();

await print({
  type: "network",
  host: "192.168.0.50",
  port: 9100
}, receipt);
```

## 상태와 용지 폭

```ts
import { createReceipt, getPaperInfo, getStatus, print } from "@maxxuxx/node-printer";

const target = { type: "winspool", printerName: "Receipt" } as const;

const status = await getStatus(target);

if (status.online !== false && !status.paperOut) {
  const info = await getPaperInfo(target);
  const receipt = createReceipt({ columns: info.columns, encoding: "cp949" })
    .text("용지 폭 기반 출력")
    .cut()
    .encode();

  await print(target, receipt);
}
```

serial과 network 상태 조회는 ESC/POS 실시간 상태 명령을 사용하고, CUPS와 Winspool은 OS spooler 상태를 읽습니다

직접 연결 프린터처럼 드라이버 너비를 읽을 수 없을 때는 `createReceipt({ paper: "80mm" })`로 용지 폭을 수동 지정합니다

## 프린터 선택

### 안정화된 Serial 수명주기

Serial 출력은 같은 path에서 하나의 session을 재사용하고 기본 500바이트 단위로
순차 전송합니다. `drain()` 이후 전체 byte와 baud rate를 기준으로 포트를 지연
종료하며 `closePrinter()` 또는 `closeAllPrinters()`로 즉시 정리할 수 있습니다.

`PrintResult.delivery`는 `transmitted`, `spooled`, `acknowledged`를 구분합니다.
Winspool/CUPS는 반환된 job ID를 `getWinspoolJobStatus()` 또는
`getCupsJobStatus()`로 조회할 수 있습니다.

### Serial

```ts
await print({
  type: "serial",
  path: "COM3",
  baudRate: 9600
}, receipt);
```

### Network

```ts
await print({
  type: "network",
  host: "192.168.0.50",
  port: 9100,
  timeoutMs: 5000,
  retry: {
    retries: 2,
    minDelayMs: 100,
    maxDelayMs: 1000,
    factor: 2
  }
}, receipt);
```

### CUPS

```ts
await print({
  type: "cups",
  printerName: "Receipt",
  documentName: "Receipt"
}, receipt);
```

### Windows Spooler

```ts
await print({
  type: "winspool",
  printerName: "Receipt",
  documentName: "Receipt"
}, receipt);
```

Winspool은 Windows에서만 사용할 수 있습니다

## 영수증 Builder

```ts
const receipt = createReceipt({ columns: 42, encoding: "cp949" })
  .initialize()
  .align("center")
  .bold()
  .text("STORE NAME")
  .bold(false)
  .divider()
  .row([
    { text: "Americano", width: 32 },
    { text: "4,500", width: 16, align: "right" }
  ])
  .qr("https://github.com/maxxuxx/node-printer")
  .feed(3)
  .cut()
  .encode();
```

지원하는 builder command는 text, row, align, bold, underline, size, feed, cut, QR, barcode, image, raw bytes입니다

## 플랫폼 지원


| 플랫폼     | Network      | Serial          | CUPS  | Winspool |
| ------- | ------------ | --------------- | ----- | -------- |
| Windows | ✅ 지원        | ✅ 지원           | ❌ 미지원 | ✅ 지원     |
| macOS   | ✅ 지원        | ✅ 지원           | ✅ 지원  | ❌ 미지원    |
| Linux   | ✅ 지원        | ✅ 지원           | ✅ 지원  | ❌ 미지원    |
| Android | ⚠️ 런타임 의존 | ⚠️ prebuild 포함 | ❌ 미지원 | ❌ 미지원    |


Windows가 아닌 플랫폼에서 winspool target을 호출하면 `ERR_UNSUPPORTED_PLATFORM`이 throw됩니다

Android serial arm과 arm64 prebuild는 포함하지만, serial 장치 접근은 Node 런타임과 OS 권한에 따라 달라서 experimental로 봐야 합니다

## 프린터 조회

```ts
import { listPrinters } from "@maxxuxx/node-printer";

const serialPorts = await listPrinters("serial");
const usbPrinters = await listPrinters("usb");
const networkPrinters = await listPrinters("network");
```

## Prebuild

일반 설치는 Windows, macOS, Linux, Android arm 또는 arm64 serial prebuild를 사용합니다

Windows에서는 bundled winspool prebuild도 함께 사용합니다

관리자와 contributor가 prebuild artifact를 검증하거나 갱신해야 할 때는 저장소에서 native addon을 직접 빌드할 수 있습니다


| 방식                         | 상태    | 사용 시점                     |
| -------------------------- | ----- | ------------------------- |
| bundled serial prebuild    | ✅ 권장  | 앱 설치와 일반 패키지 사용           |
| bundled winspool prebuild  | ✅ 권장  | Windows spooler 앱 설치          |
| repository 직접 빌드           | ✅ 가능  | native 검증과 prebuild 갱신    |
| npm install 중 source build | ❌ 미제공 | OS별 설치 예측 가능성을 위해 제공하지 않음 |


## 오류

패키지 수준 오류는 모두 `PrinterError`를 사용합니다

```ts
import { PrinterError, isPrinterError } from "@maxxuxx/node-printer";

try {
  await printer.print(receipt);
} catch (error) {
  if (isPrinterError(error)) {
    console.error(error.code, error.retryable);
  }
}
```

대표 오류 코드는 `ERR_INVALID_TARGET`, `ERR_UNSUPPORTED_PLATFORM`, `ERR_CONNECTION_TIMEOUT`, `ERR_WRITE_TIMEOUT`, `ERR_NATIVE_MODULE_UNAVAILABLE`와 transport-specific failure code입니다

## Contributors 환영

버그 수정, 문서 개선, 플랫폼 검증, 프린터 테스트 기록 기여를 환영합니다

## Repository

[https://github.com/maxxuxx/node-printer](https://github.com/maxxuxx/node-printer)

## License

MIT
