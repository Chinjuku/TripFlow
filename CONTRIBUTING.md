# Contributing Guide

คู่มือนี้สำหรับทุกคนในทีมที่จะร่วมพัฒนา TripFlow — อ่านให้ครบก่อน push ครั้งแรก

---

## สารบัญ

- [GitFlow — ระบบ branch ของเรา](#gitflow--ระบบ-branch-ของเรา)
- [การเขียน Commit Message](#การเขียน-commit-message)
- [Husky Hooks — มันทำอะไรอยู่?](#husky-hooks--มันทำอะไรอยู่)
- [วิธีเริ่มต้นทำงาน feature ใหม่](#วิธีเริ่มต้นทำงาน-feature-ใหม่)
- [แก้ปัญหาที่เจอบ่อย](#แก้ปัญหาที่เจอบ่อย)

---

## GitFlow — ระบบ branch ของเรา

เราแบ่ง branch ออกเป็นประเภทต่างๆ ตามหน้าที่ อย่าทำงานตรงๆ บน `main` หรือ `develop`

### Branch หลัก

| Branch    | หน้าที่                                          |
| --------- | ------------------------------------------------ |
| `main`    | โค้ด production — ห้ามแตะโดยตรง                  |
| `develop` | โค้ดล่าสุดที่รอ release — merge feature มาที่นี่ |

### Branch สำหรับงาน

| รูปแบบ              | ใช้เมื่อ                                      | ตัวอย่าง                       |
| ------------------- | --------------------------------------------- | ------------------------------ |
| `feature/<ชื่อ>`    | เพิ่ม feature ใหม่                            | `feature/trip-board-drag-drop` |
| `fix/<ชื่อ>`        | แก้ bug ทั่วไป                                | `fix/map-marker-overlap`       |
| `hotfix/<ชื่อ>`     | แก้ bug ด่วนบน production                     | `hotfix/payment-crash`         |
| `chore/<ชื่อ>`      | งานที่ไม่ใช่ feature/bug (update dep, config) | `chore/update-dependencies`    |
| `release/<version>` | เตรียม release                                | `release/1.2.0`                |

> **ถ้าตั้งชื่อ branch ผิด** ระบบจะบล็อกไม่ให้ push โดยอัตโนมัติ

---

## การเขียน Commit Message

เราใช้ **Conventional Commits** — รูปแบบมาตรฐานที่ทำให้อ่าน history ได้ง่าย

### รูปแบบ

```
<type>: <คำอธิบายสั้นๆ เป็นภาษาอังกฤษ lowercase>
```

### Type ที่ใช้ได้

| Type       | ใช้เมื่อ                                           |
| ---------- | -------------------------------------------------- |
| `feat`     | เพิ่ม feature ใหม่                                 |
| `fix`      | แก้ bug                                            |
| `docs`     | แก้ไข documentation                                |
| `style`    | แก้ formatting, ไม่มีผลต่อ logic                   |
| `refactor` | เปลี่ยนโครงสร้างโค้ด ไม่ใช่ feature ไม่ใช่ bug fix |
| `perf`     | ปรับให้ performance ดีขึ้น                         |
| `test`     | เพิ่ม/แก้ไข test                                   |
| `chore`    | งานที่ไม่ใช่โค้ด production (config, build tool)   |
| `revert`   | ยกเลิก commit ก่อนหน้า                             |
| `ci`       | แก้ CI/CD pipeline                                 |
| `build`    | แก้ build system หรือ dependency                   |

### ตัวอย่างที่ถูก vs ผิด

```bash
# ถูก
feat: add drag-and-drop to trip board
fix: resolve map marker overlap on mobile
chore: update bun to 1.3.14
docs: add setup instructions to readme
refactor: extract trip card into separate component

# ผิด
Added new feature          # ไม่มี type
Feat: Add new feature      # ตัวพิมพ์ใหญ่ไม่ได้
fix(something)             # ใส่ scope ก็ได้แต่ subject ต้องตามมา
fixed stuff                # ไม่มี type
```

### กฎของ subject (ส่วนหลัง `type:`)

- ต้องเป็น **lowercase** ทั้งหมด
- ห้ามยาวเกิน **72 ตัวอักษร**
- เขียนเป็น **present tense** (add, fix, update — ไม่ใช่ added, fixed)

---

## Husky Hooks — มันทำอะไรอยู่?

Husky เป็นเครื่องมือที่รันคำสั่งอัตโนมัติตอน commit/push **ทำงานได้ทั้งใน terminal และ GitHub Desktop**

### pre-commit (รันทุกครั้งก่อน commit)

ตรวจสอบไฟล์ที่ stage อยู่ก่อน commit จะสำเร็จ:

1. **Prettier check** — ตรวจว่า format ถูกต้องไหม (`.ts`, `.tsx`, `.js`, `.json`, `.md`, `.css`)
2. **TypeScript typecheck** — ตรวจ type error ใน `apps/web` และ `apps/api`

```
[ commit ] → pre-commit hook → ถ้าผ่าน → commit สำเร็จ
                             → ถ้าไม่ผ่าน → commit ถูกยกเลิก + แสดง error
```

### commit-msg (รันหลัง commit message)

ตรวจว่า commit message ถูกรูปแบบ Conventional Commits ไหม

```
[ พิมพ์ commit message ] → commit-msg hook → ถ้าถูก → commit สำเร็จ
                                           → ถ้าผิด → commit ถูกยกเลิก + บอก error
```

### pre-push (รันก่อน push)

ตรวจชื่อ branch ว่าตรงรูปแบบ GitFlow ไหม

```
[ push ] → pre-push hook → ถ้าชื่อถูก → push สำเร็จ
                         → ถ้าชื่อผิด → push ถูกบล็อก + บอกรูปแบบที่ถูก
```

---

## วิธีเริ่มต้นทำงาน feature ใหม่

### ขั้นตอน (ใช้ terminal หรือ GitHub Desktop ก็ได้)

**ใช้ terminal:**

```bash
# 1. ดึงโค้ดล่าสุดจาก develop
git checkout develop
git pull origin develop

# 2. สร้าง branch ใหม่
git checkout -b feature/ชื่อ-feature-ของคุณ

# 3. ทำงาน แล้ว commit
git add .
git commit -m "feat: add your feature description"

# 4. push ขึ้น remote
git push origin feature/ชื่อ-feature-ของคุณ

# 5. เปิด Pull Request ไปที่ develop (ไม่ใช่ main)
```

**ใช้ GitHub Desktop:**

1. `Fetch origin` เพื่อดึงโค้ดใหม่
2. Switch to `develop` branch
3. สร้าง branch ใหม่ผ่าน `Branch > New Branch` ตั้งชื่อตามรูปแบบ
4. ทำงาน แล้ว stage ไฟล์ใน GitHub Desktop
5. พิมพ์ commit message ในรูปแบบ `feat: ...` แล้วกด Commit
6. กด `Push origin`
7. เปิด Pull Request ผ่าน GitHub

---

## แก้ปัญหาที่เจอบ่อย

### Commit ไม่ผ่าน — Prettier error

```
[FAILED] prettier --check
```

**แก้:** รัน format แล้ว commit ใหม่

```bash
bun run format
git add .
git commit -m "feat: ..."
```

### Commit ไม่ผ่าน — TypeScript error

```
error TS2345: Argument of type...
```

**แก้:** แก้ type error ก่อน แล้ว commit ใหม่

```bash
# เช็ค error ที่ web
cd apps/web && bun run typecheck

# เช็ค error ที่ api
cd apps/api && bun run typecheck
```

### Push ไม่ผ่าน — Branch name ผิด

```
Branch name 'my-feature' does not match GitFlow convention.
```

**แก้:** เปลี่ยนชื่อ branch

```bash
git branch -m feature/my-feature
git push origin feature/my-feature
```

### Commit message ผิด format

```
✖ type may not be empty
✖ subject may not be empty
```

**แก้:** แก้ commit message ของ commit ล่าสุด (ถ้ายังไม่ได้ push)

```bash
git commit --amend -m "feat: correct message here"
```

### Hooks ไม่ทำงานใน GitHub Desktop

เกิดขึ้นได้เมื่อ PATH ใน GUI app ไม่เจอ `bun` ให้รัน:

```bash
# ตรวจสอบว่า bun อยู่ที่ไหน
which bun

# ถ้าไม่เจอ ลองติดตั้ง bun ใหม่
curl -fsSL https://bun.sh/install | bash
```

---

## สรุปสั้นๆ สำหรับจำ

```
branch:  feature/<name>  |  fix/<name>  |  hotfix/<name>  |  chore/<name>
commit:  feat: lowercase description
         fix: lowercase description
         chore: lowercase description
```
