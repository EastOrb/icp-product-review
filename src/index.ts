import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Product = Record<{
    id: string;
    name: string;
    description: string;
    URL: string;
    Ratings: Vec<number>;
    created_at: nat64;
    updated_at: Opt<nat64>;
}>;

type ProductPayload = Record<{
    name: string;
    description: string;
    URL: string;
}>;

const productStorage = new StableBTreeMap<string, Product>(0, 44, 1024);

function validateRating(rating: number): void {
    if (rating < 1 || rating > 5) {
        throw new Error("Rating should be an integer between 1 and 5.");
    }
}

$query;
export function getProducts(): Result<Vec<Product>, string> {
    return Result.Ok(productStorage.values());
}

$query;
export function getProduct(id: string): Result<Product, string> {
    const product = productStorage.get(id);
    if (product === null) {
        return Result.Err<Product, string>(`Product with id=${id} not found`);
    }
    return Result.Ok<Product, string>(product);
}

$update;
export function addProduct(payload: ProductPayload): Result<Product, string> {
    const { name, description, URL } = payload;

    if (!name || !description || !URL) {
        return Result.Err<Product, string>('Missing required fields');
    }

    const product: Product = {
        id: uuidv4(),
        Ratings: [],
        created_at: ic.time(),
        updated_at: Opt.None,
        name,
        description,
        URL
    };

    productStorage.insert(product.id, product);
    return Result.Ok(product);
}

$update;
export function calculateAverageRating(id: string): Result<number, string> {
    const product = productStorage.get(id);
    if (product === null) {
        return Result.Err<number, string>(`Product with id=${id} not found`);
    }

    if (product.Ratings.length === 0) {
        return Result.Ok(0);
    }

    const sum = product.Ratings.reduce((acc, current) => acc + current, 0);
    const averageRating = parseFloat((sum / product.Ratings.length).toFixed(2));
    return Result.Ok(averageRating);
}

$update;
export function rateProduct(id: string, rating: number): Result<Product, string> {
    const product = productStorage.get(id);
    if (product === null) {
        return Result.Err<Product, string>("Product not found.");
    }

    validateRating(rating);

    const updatedProduct: Product = {
        ...product,
        Ratings: [...product.Ratings, rating]
    };

    productStorage.insert(id, updatedProduct);
    return Result.Ok(updatedProduct);
}

$update;
export function updateProduct(id: string, payload: ProductPayload): Result<Product, string> {
    const product = productStorage.get(id);
    if (product === null) {
        return Result.Err<Product, string>(`Product with id=${id} not found`);
    }

    const updatedProduct: Product = {
        ...product,
        ...payload,
        updated_at: Opt.Some(ic.time())
    };

    productStorage.insert(product.id, updatedProduct);
    return Result.Ok(updatedProduct);
}

$update;
export function deleteProduct(id: string): Result<Product, string> {
    const deletedProduct = productStorage.remove(id);
    if (deletedProduct === null) {
        return Result.Err<Product, string>(`Product with id=${id} not found`);
    }
    return Result.Ok(deletedProduct);
}

// Cryptographically secure UUID generation
globalThis.crypto = {
    getRandomValues: (array: Uint8Array) => crypto.getRandomValues(array)
};
