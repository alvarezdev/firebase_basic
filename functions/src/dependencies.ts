import {authService} from "./modules/auth/auth.service";
import {fileService} from "./modules/files/file.service";
import {itemService} from "./modules/items/item.service";

export type AppServices = {
  authService: typeof authService;
  fileService: typeof fileService;
  itemService: typeof itemService;
};

export type AppDependencies = {
  services: AppServices;
};

export const appDependencies: AppDependencies = {
  services: {
    authService,
    fileService,
    itemService,
  },
};
