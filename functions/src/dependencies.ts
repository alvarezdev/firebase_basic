import * as authService from "./services/authService";
import * as firestoreService from "./services/firestoreService";
import * as storageService from "./services/storageService";

export type AppServices = {
  authService: typeof authService;
  firestoreService: typeof firestoreService;
  storageService: typeof storageService;
};

export type AppDependencies = {
  services: AppServices;
};

export const appDependencies: AppDependencies = {
  services: {
    authService,
    firestoreService,
    storageService,
  },
};
