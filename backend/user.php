<?php

declare(strict_types=1);

configureCorsHeaders();
initializeSession();

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

const DB_HOST = "localhost";
const DB_NAME = "ETC_ecommerce";
const DB_USER = "root";
const DB_PASS = "547737";

try {
    $pdo = new PDO(
        "pgsql:host=db.mtmwqifkzytywsvhpnlp.supabase.co;port=5432;dbname=postgres",
        "postgres",
        zaidan547737%%,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $exception) {
    sendJson(
        500,
        [
            "success" => false,
            "message" => "Koneksi database gagal.",
            "error" => $exception->getMessage(),
        ]
    );
}

$method = $_SERVER["REQUEST_METHOD"];
$action = isset($_GET["action"]) ? strtolower(trim((string) $_GET["action"])) : "";
$input = readJsonInput();

try {
    if ($method === "POST" && $action === "register") {
        registerUser($pdo, $input);
    }

    if ($method === "POST" && $action === "login") {
        loginUser($pdo, $input);
    }

    if ($method === "POST" && $action === "logout") {
        logoutUser();
    }

    if ($method === "GET" && ($action === "session" || $action === "me")) {
        getSessionUser();
    }

    if ($method === "GET" && $action === "products") {
        listProducts($pdo);
    }

    if ($method === "GET" && $action === "comments") {
        listComments($pdo);
    }

    if ($method === "GET" && $action === "transactions") {
        requireLogin();
        listTransactions($pdo);
    }

    if ($method === "GET" && $action === "guard") {
        guardPageAccess();
    }

    if ($method === "GET" && $action === "list") {
        requireAdmin();
        listUsers($pdo);
    }

    if ($method === "GET" && $action === "detail") {
        requireAdmin();
        getUserDetail($pdo);
    }

    if ($method === "GET" && $action === "cart") {
        requireLogin();
        getCartItems($pdo);
    }

    if ($method === "POST" && $action === "cart_add") {
        requireLogin();
        addCartItem($pdo, $input);
    }

    if ($method === "POST" && $action === "cart_update") {
        requireLogin();
        updateCartItem($pdo, $input);
    }

    if ($method === "POST" && $action === "cart_remove") {
        requireLogin();
        removeCartItem($pdo, $input);
    }

    if ($method === "POST" && $action === "cart_bulk_remove") {
        requireLogin();
        bulkRemoveCartItems($pdo, $input);
    }

    if ($method === "POST" && $action === "transaction_create") {
        requireLogin();
        createTransaction($pdo, $input);
    }

    if ($method === "POST" && $action === "transaction_update_status") {
        requireAdmin();
        updateTransactionStatus($pdo, $input);
    }

    if ($method === "POST" && $action === "comment_add") {
        requireLogin();
        addComment($pdo, $input);
    }

    if ($method === "POST" && $action === "comment_delete") {
        requireAdmin();
        deleteComment($pdo, $input);
    }

    if ($method === "POST" && $action === "product_save") {
        requireAdmin();
        saveProduct($pdo, $input);
    }

    if (($method === "DELETE" || ($method === "POST" && $action === "product_delete")) && $action === "product_delete") {
        requireAdmin();
        deleteProduct($pdo, $input);
    }

    if (($method === "PUT" || ($method === "POST" && $action === "update")) && $action === "update") {
        requireAdmin();
        updateUser($pdo, $input);
    }

    if (($method === "DELETE" || ($method === "POST" && $action === "delete")) && $action === "delete") {
        requireAdmin();
        deleteUser($pdo, $input);
    }

    sendJson(
        404,
        [
            "success" => false,
            "message" => "Endpoint user tidak ditemukan.",
            "available_actions" => [
                "POST ?action=register",
                "POST ?action=login",
                "POST ?action=logout",
                "GET ?action=session",
                "GET ?action=products",
                "GET ?action=comments",
                "GET ?action=transactions",
                "GET ?action=guard&page=admin",
                "GET ?action=list",
                "GET ?action=detail&id=1",
                "GET ?action=cart",
                "POST ?action=cart_add",
                "POST ?action=cart_update",
                "POST ?action=cart_remove",
                "POST ?action=cart_bulk_remove",
                "POST ?action=transaction_create",
                "POST ?action=transaction_update_status",
                "POST ?action=comment_add",
                "POST ?action=comment_delete",
                "POST ?action=product_save",
                "POST ?action=product_delete",
                "PUT ?action=update",
                "DELETE ?action=delete",
            ],
        ]
    );
} catch (Throwable $exception) {
    sendJson(
        500,
        [
            "success" => false,
            "message" => "Terjadi kesalahan pada server.",
            "error" => $exception->getMessage(),
        ]
    );
}

function registerUser(PDO $pdo, array $input): void
{
    $email = strtolower(trim((string) ($input["email"] ?? "")));
    $password = (string) ($input["password"] ?? "");
    $verified = isset($input["verified"]) ? (int) ((bool) $input["verified"]) : 0;
    $role = strtolower(trim((string) ($input["role"] ?? "user")));

    if ($email === "" || $password === "") {
        sendJson(422, [
            "success" => false,
            "message" => "Email dan password wajib diisi.",
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson(422, [
            "success" => false,
            "message" => "Format email tidak valid.",
        ]);
    }

    if (strlen($password) < 6) {
        sendJson(422, [
            "success" => false,
            "message" => "Password minimal 6 karakter.",
        ]);
    }

    $existingUser = findUserByEmail($pdo, $email);
    if ($existingUser) {
        sendJson(409, [
            "success" => false,
            "message" => "Email sudah terdaftar.",
        ]);
    }

    if (hasRoleColumn($pdo)) {
        $statement = $pdo->prepare(
            "INSERT INTO users (email, password, verified, role) VALUES (:email, :password, :verified, :role)"
        );
        $statement->execute([
            ":email" => $email,
            ":password" => password_hash($password, PASSWORD_DEFAULT),
            ":verified" => $verified,
            ":role" => $role === "admin" ? "admin" : "user",
        ]);
    } else {
        $statement = $pdo->prepare(
            "INSERT INTO users (email, password, verified) VALUES (:email, :password, :verified)"
        );
        $statement->execute([
            ":email" => $email,
            ":password" => password_hash($password, PASSWORD_DEFAULT),
            ":verified" => $verified,
        ]);
    }

    $userId = (int) $pdo->lastInsertId();
    $user = findUserById($pdo, $userId);

    sendJson(201, [
        "success" => true,
        "message" => "User berhasil dibuat.",
        "data" => sanitizeUser($user),
    ]);
}

function loginUser(PDO $pdo, array $input): void
{
    $email = strtolower(trim((string) ($input["email"] ?? "")));
    $password = (string) ($input["password"] ?? "");

    if ($email === "" || $password === "") {
        sendJson(422, [
            "success" => false,
            "message" => "Email dan password wajib diisi.",
        ]);
    }

    $user = findUserByEmail($pdo, $email);
    if (!$user || !password_verify($password, (string) $user["password"])) {
        sendJson(401, [
            "success" => false,
            "message" => "Email atau password salah.",
        ]);
    }

    if ((int) ($user["verified"] ?? 0) !== 1) {
        sendJson(403, [
            "success" => false,
            "message" => "Akun belum diverifikasi.",
        ]);
    }

    session_regenerate_id(true);
    $_SESSION["auth_user"] = sanitizeUser($user);

    sendJson(200, [
        "success" => true,
        "message" => "Login berhasil.",
        "data" => [
            "user" => $_SESSION["auth_user"],
        ],
    ]);
}

function logoutUser(): void
{
    clearAuthSession();

    sendJson(200, [
        "success" => true,
        "message" => "Logout berhasil.",
    ]);
}

function getSessionUser(): void
{
    $sessionUser = getAuthUserFromSession();

    if (!$sessionUser) {
        sendJson(401, [
            "success" => false,
            "message" => "Belum login.",
            "data" => [
                "user" => null,
            ],
        ]);
    }

    sendJson(200, [
        "success" => true,
        "message" => "Session login aktif.",
        "data" => [
            "user" => $sessionUser,
        ],
    ]);
}

function guardPageAccess(): void
{
    $page = strtolower(trim((string) ($_GET["page"] ?? "")));

    if ($page === "admin") {
        requireAdmin();
    } elseif ($page === "cart" || $page === "payment" || $page === "orders") {
        requireLogin();
    } else {
        sendJson(422, [
            "success" => false,
            "message" => "Parameter page tidak valid untuk guard.",
        ]);
    }

    sendJson(200, [
        "success" => true,
        "message" => "Akses diizinkan.",
        "data" => [
            "page" => $page,
            "user" => getAuthUserFromSession(),
        ],
    ]);
}

function listUsers(PDO $pdo): void
{
    $selectRole = hasRoleColumn($pdo) ? ", role" : "";
    $statement = $pdo->query(
        "SELECT id, email, verified{$selectRole}
         FROM users
         ORDER BY id DESC"
    );

    sendJson(200, [
        "success" => true,
        "message" => "Daftar user berhasil diambil.",
        "data" => $statement->fetchAll(),
    ]);
}

function getUserDetail(PDO $pdo): void
{
    $id = isset($_GET["id"]) ? (int) $_GET["id"] : 0;

    if ($id <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "ID user wajib valid.",
        ]);
    }

    $user = findUserById($pdo, $id);
    if (!$user) {
        sendJson(404, [
            "success" => false,
            "message" => "User tidak ditemukan.",
        ]);
    }

    sendJson(200, [
        "success" => true,
        "message" => "Detail user berhasil diambil.",
        "data" => sanitizeUser($user),
    ]);
}

function updateUser(PDO $pdo, array $input): void
{
    $id = (int) ($input["id"] ?? 0);
    $email = strtolower(trim((string) ($input["email"] ?? "")));
    $password = (string) ($input["password"] ?? "");
    $verified = array_key_exists("verified", $input) ? (int) ((bool) $input["verified"]) : null;
    $role = array_key_exists("role", $input) ? strtolower(trim((string) $input["role"])) : null;

    if ($id <= 0 || $email === "") {
        sendJson(422, [
            "success" => false,
            "message" => "ID dan email wajib diisi.",
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson(422, [
            "success" => false,
            "message" => "Format email tidak valid.",
        ]);
    }

    if ($password !== "" && strlen($password) < 6) {
        sendJson(422, [
            "success" => false,
            "message" => "Password minimal 6 karakter.",
        ]);
    }

    $user = findUserById($pdo, $id);
    if (!$user) {
        sendJson(404, [
            "success" => false,
            "message" => "User tidak ditemukan.",
        ]);
    }

    $existingUser = findUserByEmail($pdo, $email);
    if ($existingUser && (int) $existingUser["id"] !== $id) {
        sendJson(409, [
            "success" => false,
            "message" => "Email sudah dipakai user lain.",
        ]);
    }

    $fields = ["email = :email"];
    $params = [
        ":id" => $id,
        ":email" => $email,
    ];

    if ($password !== "") {
        $fields[] = "password = :password";
        $params[":password"] = password_hash($password, PASSWORD_DEFAULT);
    }

    if ($verified !== null) {
        $fields[] = "verified = :verified";
        $params[":verified"] = $verified;
    }

    if ($role !== null && hasRoleColumn($pdo)) {
        $fields[] = "role = :role";
        $params[":role"] = $role === "admin" ? "admin" : "user";
    }

    $statement = $pdo->prepare(
        "UPDATE users
         SET " . implode(", ", $fields) . "
         WHERE id = :id"
    );
    $statement->execute($params);

    $updatedUser = findUserById($pdo, $id);
    $sessionUser = getAuthUserFromSession();
    if ($sessionUser && (int) ($sessionUser["id"] ?? 0) === $id) {
        $_SESSION["auth_user"] = sanitizeUser($updatedUser);
    }

    sendJson(200, [
        "success" => true,
        "message" => "User berhasil diperbarui.",
        "data" => sanitizeUser($updatedUser),
    ]);
}

function deleteUser(PDO $pdo, array $input): void
{
    $id = (int) ($input["id"] ?? ($_GET["id"] ?? 0));

    if ($id <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "ID user wajib valid.",
        ]);
    }

    $user = findUserById($pdo, $id);
    if (!$user) {
        sendJson(404, [
            "success" => false,
            "message" => "User tidak ditemukan.",
        ]);
    }

    $statement = $pdo->prepare("DELETE FROM users WHERE id = :id");
    $statement->execute([":id" => $id]);

    $sessionUser = getAuthUserFromSession();
    if ($sessionUser && (int) ($sessionUser["id"] ?? 0) === $id) {
        clearAuthSession();
    }

    sendJson(200, [
        "success" => true,
        "message" => "User berhasil dihapus.",
    ]);
}

function getCartItems(PDO $pdo): void
{
    $userId = getAuthenticatedUserId();

    sendJson(200, [
        "success" => true,
        "message" => "Keranjang berhasil diambil.",
        "data" => [
            "items" => fetchCartItems($pdo, $userId),
        ],
    ]);
}

function addCartItem(PDO $pdo, array $input): void
{
    $userId = getAuthenticatedUserId();
    $productId = (int) ($input["product_id"] ?? 0);
    $qty = (int) ($input["qty"] ?? 0);

    if ($productId <= 0 || $qty <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "Produk dan qty wajib valid.",
        ]);
    }

    ensureProductExists($pdo, $productId);

    $existingItem = findCartItem($pdo, $userId, $productId);

    if ($existingItem) {
        $statement = $pdo->prepare(
            "UPDATE chart
             SET qty = qty + :qty
             WHERE id_chart = :id_chart"
        );
        $statement->execute([
            ":qty" => $qty,
            ":id_chart" => (int) $existingItem["id_chart"],
        ]);
    } else {
        $statement = $pdo->prepare(
            "INSERT INTO chart (id_user, id_product, qty)
             VALUES (:id_user, :id_product, :qty)"
        );
        $statement->execute([
            ":id_user" => $userId,
            ":id_product" => $productId,
            ":qty" => $qty,
        ]);
    }

    sendJson(200, [
        "success" => true,
        "message" => "Keranjang berhasil diperbarui.",
        "data" => [
            "items" => fetchCartItems($pdo, $userId),
        ],
    ]);
}

function updateCartItem(PDO $pdo, array $input): void
{
    $userId = getAuthenticatedUserId();
    $productId = (int) ($input["product_id"] ?? 0);
    $qty = (int) ($input["qty"] ?? 0);

    if ($productId <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "Produk wajib valid.",
        ]);
    }

    if ($qty <= 0) {
        deleteCartItemByProductId($pdo, $userId, $productId);
    } else {
        ensureProductExists($pdo, $productId);

        $statement = $pdo->prepare(
            "UPDATE chart
             SET qty = :qty
             WHERE id_user = :id_user AND id_product = :id_product"
        );
        $statement->execute([
            ":qty" => $qty,
            ":id_user" => $userId,
            ":id_product" => $productId,
        ]);
    }

    sendJson(200, [
        "success" => true,
        "message" => "Keranjang berhasil diperbarui.",
        "data" => [
            "items" => fetchCartItems($pdo, $userId),
        ],
    ]);
}

function removeCartItem(PDO $pdo, array $input): void
{
    $userId = getAuthenticatedUserId();
    $productId = (int) ($input["product_id"] ?? 0);

    if ($productId <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "Produk wajib valid.",
        ]);
    }

    deleteCartItemByProductId($pdo, $userId, $productId);

    sendJson(200, [
        "success" => true,
        "message" => "Item keranjang berhasil dihapus.",
        "data" => [
            "items" => fetchCartItems($pdo, $userId),
        ],
    ]);
}

function bulkRemoveCartItems(PDO $pdo, array $input): void
{
    $userId = getAuthenticatedUserId();
    $productIds = normalizeProductIds($input["product_ids"] ?? []);

    if ($productIds === []) {
        sendJson(422, [
            "success" => false,
            "message" => "Daftar produk wajib diisi.",
        ]);
    }

    $placeholders = implode(", ", array_fill(0, count($productIds), "?"));
    $statement = $pdo->prepare(
        "DELETE FROM chart
         WHERE id_user = ? AND id_product IN ({$placeholders})"
    );
    $statement->execute(array_merge([$userId], $productIds));

    sendJson(200, [
        "success" => true,
        "message" => "Item keranjang berhasil dihapus.",
        "data" => [
            "items" => fetchCartItems($pdo, $userId),
        ],
    ]);
}

function listProducts(PDO $pdo): void
{
    sendJson(200, [
        "success" => true,
        "message" => "Produk berhasil diambil.",
        "data" => [
            "items" => fetchProducts($pdo),
        ],
    ]);
}

function listTransactions(PDO $pdo): void
{
    $sessionUser = getAuthUserFromSession();
    $isAdmin = ($sessionUser["role"] ?? "user") === "admin";
    $userId = (int) ($sessionUser["id"] ?? 0);

    sendJson(200, [
        "success" => true,
        "message" => "Transaksi berhasil diambil.",
        "data" => [
            "items" => fetchTransactions($pdo, $isAdmin ? null : $userId),
        ],
    ]);
}

function listComments(PDO $pdo): void
{
    sendJson(200, [
        "success" => true,
        "message" => "Komentar berhasil diambil.",
        "data" => [
            "items" => fetchComments($pdo),
        ],
    ]);
}

function createTransaction(PDO $pdo, array $input): void
{
    $userId = getAuthenticatedUserId();
    $customerName = trim((string) ($input["customerName"] ?? ""));
    $customerEmail = trim((string) ($input["customerEmail"] ?? ""));
    $paymentMethod = trim((string) ($input["paymentMethod"] ?? ""));
    $paymentProof = trim((string) ($input["paymentProof"] ?? ""));
    $items = is_array($input["items"] ?? null) ? $input["items"] : [];

    if ($customerName === "" || $customerEmail === "" || $paymentMethod === "" || $paymentProof === "" || $items === []) {
        sendJson(422, [
            "success" => false,
            "message" => "Data transaksi wajib lengkap.",
        ]);
    }

    $normalizedItems = normalizeTransactionItemsInput($items);
    if ($normalizedItems === []) {
        sendJson(422, [
            "success" => false,
            "message" => "Item transaksi wajib valid.",
        ]);
    }

    $pdo->beginTransaction();

    try {
        $statement = $pdo->prepare(
            "INSERT INTO transactions (id_user, customer_name, customer_email, payment_method, payment_proof, status)
             VALUES (:id_user, :customer_name, :customer_email, :payment_method, :payment_proof, 'pending')"
        );
        $statement->execute([
            ":id_user" => $userId,
            ":customer_name" => $customerName,
            ":customer_email" => $customerEmail,
            ":payment_method" => $paymentMethod,
            ":payment_proof" => $paymentProof,
        ]);

        $transactionId = (int) $pdo->lastInsertId();
        $itemStatement = $pdo->prepare(
            "INSERT INTO transaction_items
             (id_transaction, id_product, product_name, product_category, product_price, qty, product_image, subtotal)
             VALUES (:id_transaction, :id_product, :product_name, :product_category, :product_price, :qty, :product_image, :subtotal)"
        );

        foreach ($normalizedItems as $item) {
            $itemStatement->execute([
                ":id_transaction" => $transactionId,
                ":id_product" => $item["dbId"],
                ":product_name" => $item["name"],
                ":product_category" => $item["category"],
                ":product_price" => $item["priceValue"],
                ":qty" => $item["qty"],
                ":product_image" => $item["image"],
                ":subtotal" => $item["priceValue"] * $item["qty"],
            ]);
        }

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }

    sendJson(201, [
        "success" => true,
        "message" => "Transaksi berhasil dibuat.",
        "data" => [
            "item" => findTransactionById($pdo, $transactionId),
            "items" => fetchTransactions($pdo, $userId),
        ],
    ]);
}

function updateTransactionStatus(PDO $pdo, array $input): void
{
    $transactionId = (int) ($input["transactionId"] ?? 0);
    $status = normalizeTransactionStatus($input["status"] ?? "");

    if ($transactionId <= 0 || $status === null) {
        sendJson(422, [
            "success" => false,
            "message" => "ID transaksi dan status wajib valid.",
        ]);
    }

    $statement = $pdo->prepare(
        "UPDATE transactions
         SET status = :status
         WHERE id_transaction = :id_transaction"
    );
    $statement->execute([
        ":status" => $status,
        ":id_transaction" => $transactionId,
    ]);

    if ($statement->rowCount() === 0 && !findTransactionById($pdo, $transactionId)) {
        sendJson(404, [
            "success" => false,
            "message" => "Transaksi tidak ditemukan.",
        ]);
    }

    sendJson(200, [
        "success" => true,
        "message" => "Status transaksi berhasil diperbarui.",
        "data" => [
            "item" => findTransactionById($pdo, $transactionId),
            "items" => fetchTransactions($pdo, null),
        ],
    ]);
}

function addComment(PDO $pdo, array $input): void
{
    $userId = getAuthenticatedUserId();
    $productId = (int) ($input["productId"] ?? 0);
    $userEmail = trim((string) ($input["userEmail"] ?? ""));
    $message = trim((string) ($input["message"] ?? ""));

    if ($productId <= 0 || $userEmail === "" || $message === "") {
        sendJson(422, [
            "success" => false,
            "message" => "Produk, email, dan komentar wajib diisi.",
        ]);
    }

    ensureProductExists($pdo, $productId);

    $statement = $pdo->prepare(
        "INSERT INTO comments (id_user, id_product, user_email, message)
         VALUES (:id_user, :id_product, :user_email, :message)"
    );
    $statement->execute([
        ":id_user" => $userId,
        ":id_product" => $productId,
        ":user_email" => $userEmail,
        ":message" => $message,
    ]);

    sendJson(201, [
        "success" => true,
        "message" => "Komentar berhasil dikirim.",
        "data" => [
            "item" => findCommentById($pdo, (int) $pdo->lastInsertId()),
            "items" => fetchComments($pdo),
        ],
    ]);
}

function deleteComment(PDO $pdo, array $input): void
{
    $commentId = (int) ($input["commentId"] ?? 0);

    if ($commentId <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "ID komentar wajib valid.",
        ]);
    }

    $statement = $pdo->prepare(
        "DELETE FROM comments
         WHERE id_comment = :id_comment"
    );
    $statement->execute([
        ":id_comment" => $commentId,
    ]);

    sendJson(200, [
        "success" => true,
        "message" => "Komentar berhasil dihapus.",
        "data" => [
            "items" => fetchComments($pdo),
        ],
    ]);
}

function saveProduct(PDO $pdo, array $input): void
{
    $productId = (int) ($input["dbId"] ?? 0);
    $name = trim((string) ($input["name"] ?? ""));
    $categoryName = trim((string) ($input["category"] ?? ""));
    $image = trim((string) ($input["image"] ?? ""));
    $description = trim((string) ($input["description"] ?? ""));
    $price = normalizeProductPrice($input["price"] ?? "");
    $contents = normalizeProductContents($input["contents"] ?? []);

    if ($name === "" || $categoryName === "" || $image === "" || $price === null) {
        sendJson(422, [
            "success" => false,
            "message" => "Nama, kategori, harga, dan gambar wajib valid.",
        ]);
    }

    $categoryId = findOrCreateCategoryId($pdo, $categoryName);

    if ($productId > 0) {
        ensureProductExists($pdo, $productId);

        $statement = $pdo->prepare(
            "UPDATE product
             SET id_category = :id_category, name = :name, price = :price, image = :image, description = :description
             WHERE id_product = :id_product"
        );
        $statement->execute([
            ":id_product" => $productId,
            ":id_category" => $categoryId,
            ":name" => $name,
            ":price" => $price,
            ":image" => $image,
            ":description" => $description,
        ]);
    } else {
        $statement = $pdo->prepare(
            "INSERT INTO product (id_category, name, price, image, description)
             VALUES (:id_category, :name, :price, :image, :description)"
        );
        $statement->execute([
            ":id_category" => $categoryId,
            ":name" => $name,
            ":price" => $price,
            ":image" => $image,
            ":description" => $description,
        ]);
        $productId = (int) $pdo->lastInsertId();
    }

    syncProductContents($pdo, $productId, $contents);

    $savedProduct = findProductById($pdo, $productId);

    sendJson(200, [
        "success" => true,
        "message" => "Produk berhasil disimpan.",
        "data" => [
            "item" => $savedProduct,
            "items" => fetchProducts($pdo),
        ],
    ]);
}

function deleteProduct(PDO $pdo, array $input): void
{
    $productId = (int) ($input["dbId"] ?? ($_GET["dbId"] ?? 0));

    if ($productId <= 0) {
        sendJson(422, [
            "success" => false,
            "message" => "ID produk wajib valid.",
        ]);
    }

    $product = findProductById($pdo, $productId);
    if (!$product) {
        sendJson(404, [
            "success" => false,
            "message" => "Produk tidak ditemukan.",
        ]);
    }

    $statement = $pdo->prepare("DELETE FROM product WHERE id_product = :id_product");
    $statement->execute([
        ":id_product" => $productId,
    ]);

    sendJson(200, [
        "success" => true,
        "message" => "Produk berhasil dihapus.",
        "data" => [
            "items" => fetchProducts($pdo),
        ],
    ]);
}

function fetchCartItems(PDO $pdo, int $userId): array
{
    $statement = $pdo->prepare(
        "SELECT id_product, qty
         FROM chart
         WHERE id_user = :id_user
         ORDER BY id_chart ASC"
    );
    $statement->execute([
        ":id_user" => $userId,
    ]);

    return array_map(
        static fn(array $item): array => [
            "productId" => (int) $item["id_product"],
            "qty" => (int) $item["qty"],
        ],
        $statement->fetchAll()
    );
}

function findCartItem(PDO $pdo, int $userId, int $productId): ?array
{
    $statement = $pdo->prepare(
        "SELECT id_chart, qty
         FROM chart
         WHERE id_user = :id_user AND id_product = :id_product
         LIMIT 1"
    );
    $statement->execute([
        ":id_user" => $userId,
        ":id_product" => $productId,
    ]);
    $item = $statement->fetch();

    return $item ?: null;
}

function deleteCartItemByProductId(PDO $pdo, int $userId, int $productId): void
{
    $statement = $pdo->prepare(
        "DELETE FROM chart
         WHERE id_user = :id_user AND id_product = :id_product"
    );
    $statement->execute([
        ":id_user" => $userId,
        ":id_product" => $productId,
    ]);
}

function ensureProductExists(PDO $pdo, int $productId): void
{
    $statement = $pdo->prepare(
        "SELECT id_product
         FROM product
         WHERE id_product = :id_product
         LIMIT 1"
    );
    $statement->execute([
        ":id_product" => $productId,
    ]);

    if ($statement->fetch()) {
        return;
    }

    sendJson(404, [
        "success" => false,
        "message" => "Produk tidak ditemukan.",
    ]);
}

function normalizeProductIds(mixed $productIds): array
{
    if (!is_array($productIds)) {
        return [];
    }

    $normalized = array_values(array_unique(array_filter(
        array_map(
            static fn(mixed $productId): int => (int) $productId,
            $productIds
        ),
        static fn(int $productId): bool => $productId > 0
    )));

    return $normalized;
}

function fetchProducts(PDO $pdo): array
{
    $contentsByProductId = fetchProductContentsMap($pdo);
    $statement = $pdo->query(
        "SELECT p.id_product, p.name, p.price, p.image, p.description, c.name AS category_name
         FROM product p
         INNER JOIN category c ON c.id_category = p.id_category
         ORDER BY p.id_product ASC"
    );

    return array_map(
        static fn(array $product): array => formatProductRow(
            $product,
            $contentsByProductId[(int) ($product["id_product"] ?? 0)] ?? []
        ),
        $statement->fetchAll()
    );
}

function findProductById(PDO $pdo, int $productId): ?array
{
    $statement = $pdo->prepare(
        "SELECT p.id_product, p.name, p.price, p.image, p.description, c.name AS category_name
         FROM product p
         INNER JOIN category c ON c.id_category = p.id_category
         WHERE p.id_product = :id_product
         LIMIT 1"
    );
    $statement->execute([
        ":id_product" => $productId,
    ]);
    $product = $statement->fetch();

    if (!$product) {
        return null;
    }

    $contentsByProductId = fetchProductContentsMap($pdo, [$productId]);

    return formatProductRow($product, $contentsByProductId[$productId] ?? []);
}

function formatProductRow(array $product, array $contents = []): array
{
    $name = trim((string) ($product["name"] ?? ""));

    return [
        "dbId" => (int) ($product["id_product"] ?? 0),
        "id" => slugifyValue($name),
        "category" => trim((string) ($product["category_name"] ?? "")),
        "name" => $name,
        "price" => number_format((float) ($product["price"] ?? 0), 2, ",", "."),
        "image" => trim((string) ($product["image"] ?? "")),
        "description" => trim((string) ($product["description"] ?? "")),
        "contents" => $contents,
    ];
}

function fetchProductContentsMap(PDO $pdo, ?array $productIds = null): array
{
    if (!hasProductContentsTable($pdo)) {
        return [];
    }

    $params = [];
    $whereClause = "";

    if (is_array($productIds) && $productIds !== []) {
        $normalizedIds = array_values(array_unique(array_filter(
            array_map(static fn(mixed $productId): int => (int) $productId, $productIds),
            static fn(int $productId): bool => $productId > 0
        )));

        if ($normalizedIds === []) {
            return [];
        }

        $placeholders = implode(", ", array_fill(0, count($normalizedIds), "?"));
        $whereClause = "WHERE id_product IN ({$placeholders})";
        $params = $normalizedIds;
    }

    $statement = $pdo->prepare(
        "SELECT id_product, content_text
         FROM product_contents
         {$whereClause}
         ORDER BY sort_order ASC, id_product_content ASC"
    );
    $statement->execute($params);

    $contentsByProductId = [];

    foreach ($statement->fetchAll() as $row) {
        $productId = (int) ($row["id_product"] ?? 0);
        $content = trim((string) ($row["content_text"] ?? ""));

        if ($productId <= 0 || $content === "") {
            continue;
        }

        if (!isset($contentsByProductId[$productId])) {
            $contentsByProductId[$productId] = [];
        }

        $contentsByProductId[$productId][] = $content;
    }

    return $contentsByProductId;
}

function syncProductContents(PDO $pdo, int $productId, array $contents): void
{
    if (!hasProductContentsTable($pdo)) {
        return;
    }

    $deleteStatement = $pdo->prepare(
        "DELETE FROM product_contents
         WHERE id_product = :id_product"
    );
    $deleteStatement->execute([
        ":id_product" => $productId,
    ]);

    if ($contents === []) {
        return;
    }

    $insertStatement = $pdo->prepare(
        "INSERT INTO product_contents (id_product, content_text, sort_order)
         VALUES (:id_product, :content_text, :sort_order)"
    );

    foreach ($contents as $index => $content) {
        $insertStatement->execute([
            ":id_product" => $productId,
            ":content_text" => $content,
            ":sort_order" => $index + 1,
        ]);
    }
}

function normalizeProductContents(mixed $contentsInput): array
{
    if (is_array($contentsInput)) {
        $contents = $contentsInput;
    } else {
        $contents = preg_split('/\r\n|\r|\n/', (string) $contentsInput) ?: [];
    }

    return array_values(array_filter(
        array_map(static fn(mixed $content): string => trim((string) $content), $contents),
        static fn(string $content): bool => $content !== ''
    ));
}

function findOrCreateCategoryId(PDO $pdo, string $categoryName): int
{
    $normalizedName = trim($categoryName);
    $statement = $pdo->prepare(
        "SELECT id_category
         FROM category
         WHERE LOWER(name) = LOWER(:name)
         LIMIT 1"
    );
    $statement->execute([
        ":name" => $normalizedName,
    ]);
    $categoryId = (int) $statement->fetchColumn();

    if ($categoryId > 0) {
        return $categoryId;
    }

    $slugBase = slugifyValue($normalizedName);
    $slug = $slugBase !== "" ? $slugBase : "kategori";
    $suffix = 1;

    while (categorySlugExists($pdo, $slug)) {
        $suffix += 1;
        $slug = "{$slugBase}-{$suffix}";
    }

    $statement = $pdo->prepare(
        "INSERT INTO category (name, slug)
         VALUES (:name, :slug)"
    );
    $statement->execute([
        ":name" => $normalizedName,
        ":slug" => $slug,
    ]);

    return (int) $pdo->lastInsertId();
}

function categorySlugExists(PDO $pdo, string $slug): bool
{
    $statement = $pdo->prepare(
        "SELECT id_category
         FROM category
         WHERE slug = :slug
         LIMIT 1"
    );
    $statement->execute([
        ":slug" => $slug,
    ]);

    return (bool) $statement->fetchColumn();
}

function normalizeProductPrice(mixed $priceInput): ?float
{
    if (is_int($priceInput) || is_float($priceInput)) {
        return (float) $priceInput;
    }

    $price = trim((string) $priceInput);
    if ($price === "") {
        return null;
    }

    $normalized = str_replace(".", "", $price);
    $normalized = str_replace(",", ".", $normalized);

    if (!is_numeric($normalized)) {
        return null;
    }

    return (float) $normalized;
}

function slugifyValue(string $value): string
{
    $normalized = strtolower(trim($value));
    $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';
    $normalized = trim($normalized, '-');

    return $normalized;
}

function fetchTransactions(PDO $pdo, ?int $userId): array
{
    $params = [];
    $whereClause = "";

    if ($userId !== null) {
        $whereClause = "WHERE t.id_user = :id_user";
        $params[":id_user"] = $userId;
    }

    $statement = $pdo->prepare(
        "SELECT
            t.id_transaction,
            t.id_user,
            t.customer_name,
            t.customer_email,
            t.payment_method,
            t.payment_proof,
            t.status,
            t.created_at,
            ti.id_transaction_item,
            ti.id_product,
            ti.product_name,
            ti.product_category,
            ti.product_price,
            ti.qty,
            ti.product_image,
            ti.subtotal
         FROM transactions t
         LEFT JOIN transaction_items ti ON ti.id_transaction = t.id_transaction
         {$whereClause}
         ORDER BY t.created_at DESC, ti.id_transaction_item ASC"
    );
    $statement->execute($params);

    return groupTransactionRows($statement->fetchAll());
}

function findTransactionById(PDO $pdo, int $transactionId): ?array
{
    $statement = $pdo->prepare(
        "SELECT
            t.id_transaction,
            t.id_user,
            t.customer_name,
            t.customer_email,
            t.payment_method,
            t.payment_proof,
            t.status,
            t.created_at,
            ti.id_transaction_item,
            ti.id_product,
            ti.product_name,
            ti.product_category,
            ti.product_price,
            ti.qty,
            ti.product_image,
            ti.subtotal
         FROM transactions t
         LEFT JOIN transaction_items ti ON ti.id_transaction = t.id_transaction
         WHERE t.id_transaction = :id_transaction
         ORDER BY ti.id_transaction_item ASC"
    );
    $statement->execute([
        ":id_transaction" => $transactionId,
    ]);

    $transactions = groupTransactionRows($statement->fetchAll());

    return $transactions[0] ?? null;
}

function groupTransactionRows(array $rows): array
{
    $grouped = [];

    foreach ($rows as $row) {
        $transactionId = (int) ($row["id_transaction"] ?? 0);
        if ($transactionId <= 0) {
            continue;
        }

        if (!isset($grouped[$transactionId])) {
            $grouped[$transactionId] = [
                "id" => (string) $transactionId,
                "dbId" => $transactionId,
                "customerName" => trim((string) ($row["customer_name"] ?? "")),
                "customerEmail" => trim((string) ($row["customer_email"] ?? "")),
                "paymentMethod" => trim((string) ($row["payment_method"] ?? "")),
                "paymentProof" => trim((string) ($row["payment_proof"] ?? "")),
                "status" => trim((string) ($row["status"] ?? "pending")),
                "totalPrice" => 0,
                "createdAt" => trim((string) ($row["created_at"] ?? "")),
                "items" => [],
            ];
        }

        $itemId = (int) ($row["id_transaction_item"] ?? 0);
        if ($itemId <= 0) {
            continue;
        }

        $subtotal = (float) ($row["subtotal"] ?? 0);
        $grouped[$transactionId]["totalPrice"] += $subtotal;
        $grouped[$transactionId]["items"][] = [
            "id" => (string) ($row["id_product"] ?? ""),
            "dbId" => (int) ($row["id_product"] ?? 0),
            "name" => trim((string) ($row["product_name"] ?? "")),
            "qty" => (int) ($row["qty"] ?? 0),
            "price" => number_format((float) ($row["product_price"] ?? 0), 2, ",", "."),
            "image" => trim((string) ($row["product_image"] ?? "")),
            "category" => trim((string) ($row["product_category"] ?? "")),
        ];
    }

    return array_values($grouped);
}

function fetchComments(PDO $pdo): array
{
    $statement = $pdo->query(
        "SELECT c.id_comment, c.id_product, c.user_email, c.message, c.created_at, u.email
         FROM comments c
         INNER JOIN users u ON u.id = c.id_user
         ORDER BY c.created_at DESC, c.id_comment DESC"
    );

    return array_map(
        static fn(array $comment): array => formatCommentRow($comment),
        $statement->fetchAll()
    );
}

function findCommentById(PDO $pdo, int $commentId): ?array
{
    $statement = $pdo->prepare(
        "SELECT c.id_comment, c.id_product, c.user_email, c.message, c.created_at, u.email
         FROM comments c
         INNER JOIN users u ON u.id = c.id_user
         WHERE c.id_comment = :id_comment
         LIMIT 1"
    );
    $statement->execute([
        ":id_comment" => $commentId,
    ]);
    $comment = $statement->fetch();

    return $comment ? formatCommentRow($comment) : null;
}

function formatCommentRow(array $comment): array
{
    $email = trim((string) ($comment["user_email"] ?? $comment["email"] ?? ""));

    return [
        "id" => (string) ($comment["id_comment"] ?? ""),
        "dbId" => (int) ($comment["id_comment"] ?? 0),
        "productId" => (int) ($comment["id_product"] ?? 0),
        "userName" => deriveDisplayNameFromEmail($email),
        "userEmail" => $email,
        "message" => trim((string) ($comment["message"] ?? "")),
        "createdAt" => trim((string) ($comment["created_at"] ?? "")),
    ];
}

function normalizeTransactionItemsInput(array $items): array
{
    $normalized = [];

    foreach ($items as $item) {
        $dbId = (int) ($item["dbId"] ?? 0);
        $name = trim((string) ($item["name"] ?? ""));
        $category = trim((string) ($item["category"] ?? ""));
        $image = trim((string) ($item["image"] ?? ""));
        $qty = (int) ($item["qty"] ?? 0);
        $priceValue = normalizeProductPrice($item["price"] ?? "");

        if ($dbId <= 0 || $name === "" || $category === "" || $qty <= 0 || $priceValue === null) {
            continue;
        }

        $normalized[] = [
            "dbId" => $dbId,
            "name" => $name,
            "category" => $category,
            "image" => $image,
            "qty" => $qty,
            "priceValue" => $priceValue,
        ];
    }

    return $normalized;
}

function normalizeTransactionStatus(mixed $statusInput): ?string
{
    $status = strtolower(trim((string) $statusInput));
    $allowed = ["pending", "paid", "failed", "canceled"];

    return in_array($status, $allowed, true) ? $status : null;
}

function deriveDisplayNameFromEmail(string $email): string
{
    $localPart = explode('@', $email)[0] ?? '';
    $normalized = trim((string) preg_replace('/[._-]+/', ' ', $localPart));

    if ($normalized === '') {
        return 'User ETC';
    }

    return ucwords($normalized);
}

function findUserByEmail(PDO $pdo, string $email): ?array
{
    $statement = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $statement->execute([":email" => $email]);
    $user = $statement->fetch();

    return $user ?: null;
}

function findUserById(PDO $pdo, int $id): ?array
{
    $statement = $pdo->prepare("SELECT * FROM users WHERE id = :id LIMIT 1");
    $statement->execute([":id" => $id]);
    $user = $statement->fetch();

    return $user ?: null;
}

function sanitizeUser(?array $user): ?array
{
    if (!$user) {
        return null;
    }

    unset($user["password"]);
    if (!array_key_exists("role", $user)) {
        $user["role"] = "user";
    }
    return $user;
}

function getAuthUserFromSession(): ?array
{
    if (!isset($_SESSION["auth_user"]) || !is_array($_SESSION["auth_user"])) {
        return null;
    }

    $sessionUser = sanitizeUser($_SESSION["auth_user"]);
    if (!$sessionUser) {
        return null;
    }

    $_SESSION["auth_user"] = $sessionUser;
    return $sessionUser;
}

function requireLogin(): void
{
    $sessionUser = getAuthUserFromSession();

    if ($sessionUser) {
        return;
    }

    sendJson(401, [
        "success" => false,
        "message" => "Harus login dulu.",
        "data" => [
            "user" => null,
        ],
    ]);
}

function getAuthenticatedUserId(): int
{
    $sessionUser = getAuthUserFromSession();
    $userId = (int) ($sessionUser["id"] ?? 0);

    if ($userId > 0) {
        return $userId;
    }

    sendJson(401, [
        "success" => false,
        "message" => "Harus login dulu.",
        "data" => [
            "user" => null,
        ],
    ]);
}

function requireAdmin(): void
{
    $sessionUser = getAuthUserFromSession();

    if (!$sessionUser) {
        sendJson(401, [
            "success" => false,
            "message" => "Harus login dulu.",
            "data" => [
                "user" => null,
            ],
        ]);
    }

    if (($sessionUser["role"] ?? "user") !== "admin") {
        sendJson(403, [
            "success" => false,
            "message" => "Akses admin ditolak.",
            "data" => [
                "user" => $sessionUser,
            ],
        ]);
    }
}

function hasRoleColumn(PDO $pdo): bool
{
    static $hasRoleColumn = null;

    if ($hasRoleColumn !== null) {
        return $hasRoleColumn;
    }

    $statement = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
    $hasRoleColumn = (bool) $statement->fetch();

    return $hasRoleColumn;
}

function hasProductContentsTable(PDO $pdo): bool
{
    static $hasProductContentsTable = null;

    if ($hasProductContentsTable !== null) {
        return $hasProductContentsTable;
    }

    $statement = $pdo->query("SHOW TABLES LIKE 'product_contents'");
    $hasProductContentsTable = (bool) $statement->fetch();

    return $hasProductContentsTable;
}

function readJsonInput(): array
{
    $raw = file_get_contents("php://input");

    if (!$raw) {
        return $_POST ?: [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return $_POST ?: [];
    }

    return $decoded;
}

function sendJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function configureCorsHeaders(): void
{
    $origin = isset($_SERVER["HTTP_ORIGIN"]) ? trim((string) $_SERVER["HTTP_ORIGIN"]) : "";
    $allowCredentials = $origin !== "";

    if ($allowCredentials) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    } else {
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}

function initializeSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $sessionPath = sys_get_temp_dir() . "/etc_ecommerce_sessions";
    if (!is_dir($sessionPath)) {
        @mkdir($sessionPath, 0775, true);
    }
    if (is_dir($sessionPath) && is_writable($sessionPath)) {
        session_save_path($sessionPath);
    }

    $secureCookie = isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off";
    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "domain" => "",
        "secure" => $secureCookie,
        "httponly" => true,
        "samesite" => "Lax",
    ]);

    if (!session_start()) {
        sendJson(500, [
            "success" => false,
            "message" => "Session server gagal diaktifkan.",
        ]);
    }
}

function clearAuthSession(): void
{
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            "",
            [
                "expires" => time() - 42000,
                "path" => $params["path"],
                "domain" => $params["domain"],
                "secure" => (bool) $params["secure"],
                "httponly" => (bool) $params["httponly"],
                "samesite" => $params["samesite"] ?? "Lax",
            ]
        );
    }

    session_destroy();
}
