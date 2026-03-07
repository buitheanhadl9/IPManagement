# Hướng Dẫn Sử Dụng Git

## 1. Cài Đặt Git

### Windows
1. Tải Git từ https://git-scm.com/download/win
2. Chạy trình cài đặt và làm theo hướng dẫn
3. Kiểm tra cài đặt:
```bash
git --version
```

### Cấu hình thông tin người dùng (chỉ cần làm 1 lần)
```bash
# Thiết lập tên người dùng
git config --global user.name "Tên của bạn"

# Thiết lập email
git config --global user.email "email@example.com"

# Kiểm tra cấu hình
git config --list
```

## 2. Khởi Tạo Repository Git

### Tạo repository mới cho dự án hiện tại
```bash
# Khởi tạo git repository
git init

# Kiểm tra trạng thái
git status
```

### Tạo file .gitignore
Tạo file `.gitignore` để loại bỏ các thư mục không cần thiết:
```
# Build outputs
bin/
obj/
Debug/
Release/

# User-specific files
.vs/
.vscode/
*.user

# Environment files
appsettings.Development.json
*.pfx
*.json

# Node modules (nếu có)
node_modules/

# Logs
*.log
```

## 3. Các Lệnh Git Cơ Bản

### Kiểm tra trạng thái
```bash
# Xem trạng thái các file
git status

# Xem trạng thái chi tiết
git status -s
```

### Thêm file vào staging area
```bash
# Thêm tất cả file
git add .

# Thêm file cụ thể
git add filename.ext

# Thêm tất cả file trong thư mục
git add folder/
```

### Commit thay đổi
```bash
# Commit với thông báo
git commit -m "Thông báo commit"

# Commit và xem chi tiết
git commit -v -m "Thông báo commit"
```

### Xem lịch sử commit
```bash
# Xem lịch sử commit đơn giản
git log

# Xem lịch sử commit dạng cây
git log --oneline

# Xem lịch sử commit chi tiết
git log --graph --oneline --all
```

## 4. Làm Việc Với Remote Repository

### Kết nối với GitHub/GitLab

```bash
# Tạo repository mới trên GitHub, sau đó kết nối
git remote add origin https://github.com/username/repository.git

# Kiểm tra remote
git remote -v

# Đẩy code lên remote
git push -u origin main

# Hoặc nếu branch chính là master
git push -u origin master
```

### Clone repository
```bash
# Clone repository về máy
git clone https://github.com/username/repository.git
```

### Pull thay đổi từ remote
```bash
# Pull thay đổi về
git pull origin main
```

## 5. Quản Lý Branch

### Tạo và chuyển branch
```bash
# Xem danh sách branch
git branch

# Tạo branch mới
git branch ten-branch

# Chuyển sang branch
git checkout ten-branch

# Tạo và chuyển branch ngay
git checkout -b ten-branch

# Hoặc dùng lệnh mới
git switch -c ten-branch
```

### Merge branch
```bash
# Chuyển về branch chính
git checkout main

# Merge branch vào current branch
git merge ten-branch

# Hoặc dùng lệnh mới
git switch main
git merge ten-branch
```

### Xóa branch
```bash
# Xóa branch đã merge
git branch -d ten-branch

# Xóa branch chưa merge (cẩn thận)
git branch -D ten-branch
```

## 6. Giải Quyết Conflict

### Khi có conflict xảy ra
1. Git sẽ thông báo file có conflict
2. Mở file và tìm phần conflict:
```
<<<<<<< HEAD
Nội dung ở branch hiện tại
=======
Nội dung ở branch đang merge
>>>>>>> ten-branch
```
3. Chỉnh sửa để giải quyết conflict
4. Thêm file đã giải quyết:
```bash
git add file-conflict.ext
git commit -m "Giải quyết conflict"
```

## 7. Các Lệnh Hữu Ích Khác

### Undo thay đổi
```bash
# Hủy thay đổi trong working directory (trước khi add)
git checkout -- filename.ext

# Hủy thay đổi trong staging area (trước khi commit)
git reset HEAD filename.ext

# Hủy commit cuối cùng (giữ thay đổi)
git reset --soft HEAD~1

# Hủy commit cuối cùng (mất thay đổi - cẩn thận)
git reset --hard HEAD~1
```

### Stash (tạm lưu thay đổi)
```bash
# Lưu thay đổi tạm
git stash

# Xem danh sách stash
git stash list

# Lấy lại thay đổi
git stash pop

# Áp dụng stash mà không xóa khỏi danh sách
git stash apply
```

### Diff (xem thay đổi)
```bash
# Xem thay đổi chưa add
git diff

# Xem thay đổi đã add chưa commit
git diff --staged

# So sánh 2 branch
git diff branch1 branch2
```

### Tag (gán phiên bản)
```bash
# Tạo tag
git tag v1.0.0

# Tạo tag annotated
git tag -a v1.0.0 -m "Phiên bản 1.0.0"

# Đẩy tag lên remote
git push origin v1.0.0

# Đẩy tất cả tag
git push origin --tags
```

## 8. Workflow Cho Dự Án

### Workflow cơ bản
```bash
# 1. Tạo branch mới cho feature
git checkout -b feature/ten-feature

# 2. Phát triển và commit
git add .
git commit -m "Thêm tính năng X"

# 3. Đẩy branch lên remote
git push origin feature/ten-feature

# 4. Tạo Pull Request trên GitHub

# 5. Sau khi merge, cập nhật branch chính
git checkout main
git pull origin main

# 6. Xóa branch feature
git branch -d feature/ten-feature
```

## 9. Best Practices

### commit message tốt
```
# Cấu trúc
<type>(<scope>): <subject>

# Ví dụ
feat(auth): Thêm tính năng đăng nhập
fix(api): Sửa lỗi 500 khi gọi API
docs(readme): Cập nhật hướng dẫn cài đặt
style(components): Định dạng lại component
refactor(utils): Tái cấu trúc hàm utility
test(auth): Thêm test cho authentication
chore(deps): Cập nhật thư viện
```

### Types phổ biến
- `feat`: Tính năng mới
- `fix`: Sửa bug
- `docs`: Tài liệu
- `style`: Định dạng
- `refactor`: Tái cấu trúc
- `test`: Test
- `chore`: Maintenance

## 10. Lệnh Nhanh Tham Khảo

```bash
# Khởi tạo
git init

# Kiểm tra
git status

# Thêm
git add .

# Commit
git commit -m "message"

# Xem log
git log --oneline

# Tạo branch
git checkout -b feature

# Push
git push origin feature

# Pull
git pull origin main

# Merge
git merge feature

# Stash
git stash

# Diff
git diff
```

## 11. Git GUI Tools

### Các công cụ GUI phổ biến
- **GitHub Desktop**: Dễ sử dụng, tích hợp GitHub
- **GitKraken**: Giao diện đẹp, nhiều tính năng
- **Sourcetree**: Miễn phí, mạnh mẽ
- **VS Code Git Integration**: Tích hợp sẵn trong VS Code

### Sử dụng Git trong VS Code
1. Mở Source Control (Ctrl+Shift+G)
2. Thêm file: Click + bên cạnh file
3. Commit: Nhập message và click check
4. Branch: Click vào số branch ở thanh dưới