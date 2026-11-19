import bcrypt from "bcryptjs";
import { ROLES } from "../constants/index.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/token.js";

const BCRYPT_ROUNDS = 12;

export const toPublicUser = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role });

let dummyHash;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("timing-equalizer", BCRYPT_ROUNDS));

export const createAccount = async ({ name, email, password, role = ROLES.USER }) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const user = await userRepository.create({ name, email, passwordHash, role });
    return toPublicUser(user);
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict("An account with this email already exists.");
    throw err;
  }
};

export const authService = {
  async register({ name, email, password }) {
    const user = await createAccount({ name, email, password });
    return { user, token: signToken(user) };
  },
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, { withPassword: true });
    const hash = user?.passwordHash ?? (await getDummyHash());
    const passwordMatches = await bcrypt.compare(password, hash);
    if (!user || !passwordMatches || !user.isActive) throw ApiError.unauthorized("Invalid email or password.");
    return { user: toPublicUser(user), token: signToken(user) };
  },
};
