import { userRepository } from "./user.repository.js";
import { updateUserInput } from "./user.validation.js";

export const userService = {
  findUserById: async (id: string) => {
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },

  findAllUsers: async (query: any) => {
    const queryObj = { ...query };
    const allowedFields = ["role", "status"];

    Object.keys(queryObj).forEach((key) => {
      if (!allowedFields.includes(key)) {
        delete queryObj[key];
      }
    });

    
    return await userRepository.findAllUsers(queryObj);
  },

  updateUserById: async (id: string, input: updateUserInput) => {
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return await userRepository.updateUserById(id, input);
  },

  deleteUserById: async (id: string) => {
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    await userRepository.deleteUserById(id);
  },
};
