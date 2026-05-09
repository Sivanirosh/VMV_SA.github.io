# Kaizen — supplementary examples

Optional deeper TypeScript illustrations for [SKILL.md](SKILL.md) pillars 2–3.

## Poka-Yoke — non-empty array

```typescript
type NonEmptyArray<T> = [T, ...T[]];

const firstItem = <T>(items: NonEmptyArray<T>): T => {
  return items[0];
};

const items: number[] = [1, 2, 3];
if (items.length > 0) {
  firstItem(items as NonEmptyArray<number>);
}
```

## Poka-Yoke — validation and branded types

```typescript
const processPaymentBad = (amount: number) => {
  const fee = amount * 0.03; // Used before validation!
  if (amount <= 0) throw new Error('Invalid amount');
};

const processPayment = (amount: number) => {
  if (amount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  if (amount > 10000) {
    throw new Error('Payment exceeds maximum allowed');
  }
  const fee = amount * 0.03;
};

type PositiveNumber = number & { readonly __brand: 'PositiveNumber' };

const validatePositive = (n: number): PositiveNumber => {
  if (n <= 0) throw new Error('Must be positive');
  return n as PositiveNumber;
};

const processPaymentSafe = (amount: PositiveNumber) => {
  const fee = amount * 0.03;
};

const handlePaymentRequest = (req: Request) => {
  const amount = validatePositive(req.body.amount);
  processPaymentSafe(amount);
};
```

## Poka-Yoke — guards

```typescript
const processUser = (user: User | null) => {
  if (!user) {
    logger.error('User not found');
    return;
  }
  if (!user.email) {
    logger.error('User email missing');
    return;
  }
  if (!user.isActive) {
    logger.info('User inactive, skipping');
    return;
  }
  sendEmail(user.email, 'Welcome!');
};
```

## Poka-Yoke — configuration at startup

```typescript
type Config = {
  apiKey: string;
  timeout: number;
};

const loadConfig = (): Config => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY environment variable required');
  }
  return { apiKey, timeout: 5000 };
};

const config = loadConfig();
const client = new APIClient(config);
```

## Standardized work — following patterns

**Good — consistency**

```typescript
class UserAPIClient {
  async getUser(id: string): Promise<User> {
    return this.fetch(`/users/${id}`);
  }
}

class OrderAPIClient {
  async getOrder(id: string): Promise<Order> {
    return this.fetch(`/orders/${id}`);
  }
}
```

**Bad — inconsistency**

```typescript
class UserAPIClient { /* ... */ }

const getOrder = async (id: string): Promise<Order> => {
  // Breaking consistency "because I prefer functions"
};
```

## Standardized work — Result type

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const fetchUser = async (id: string): Promise<Result<User, Error>> => {
  try {
    const user = await db.users.findById(id);
    if (!user) {
      return { ok: false, error: new Error('User not found') };
    }
    return { ok: true, value: user };
  } catch (err) {
    return { ok: false, error: err as Error };
  }
};

const result = await fetchUser('123');
if (!result.ok) {
  logger.error('Failed to fetch user', result.error);
  return;
}
const user = result.value;
```
