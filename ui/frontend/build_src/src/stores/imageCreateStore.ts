/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import create from "zustand";
import produce from "immer";
import { devtools } from "zustand/middleware";

import { useRandomSeed } from "../utils";

export interface ImageCreationUiOptions {
  isUseRandomSeed: boolean;
  isUseAutoSave: boolean;
  isSoundEnabled: boolean;
}

export const SAMPLER_OPTIONS = [
  'plms',
  'ddim',
  'heun',
  'euler',
  'euler_a',
  'dpm2',
  'dpm2_a',
  'lms',
] as const;

export interface ImageRequest {
  session_id: string;
  prompt: string;
  seed: number;
  num_outputs: number;
  num_inference_steps: number;
  guidance_scale: number;
  width:
  | 128
  | 192
  | 256
  | 320
  | 384
  | 448
  | 512
  | 576
  | 640
  | 704
  | 768
  | 832
  | 896
  | 960
  | 1024;
  height:
  | 128
  | 192
  | 256
  | 320
  | 384
  | 448
  | 512
  | 576
  | 640
  | 704
  | 768
  | 832
  | 896
  | 960
  | 1024;
  // allow_nsfw: boolean
  turbo: boolean;
  use_cpu: boolean;
  use_full_precision: boolean;
  save_to_disk_path: null | string;
  use_face_correction: null | "GFPGANv1.3";
  use_upscale: null | "RealESRGAN_x4plus" | "RealESRGAN_x4plus_anime_6B" | "";
  show_only_filtered_image: boolean;
  init_image: undefined | string;
  prompt_strength: undefined | number;
  sampler: typeof SAMPLER_OPTIONS[number];
  stream_progress_updates: true;
  stream_image_progress: boolean;
}

export interface ModifierPreview {
  name: string;
  path: string;
}

export interface ModifierObject {
  category?: string;
  modifier: string;
  previews: ModifierPreview[];
}

interface ModifiersList {
  category: string;
  modifiers: ModifierObject[];
}

type ModifiersOptionList = ModifiersList[];

interface ImageCreateState {
  parallelCount: number;
  requestOptions: ImageRequest;
  allModifiers: ModifiersOptionList;
  tags: string[];
  tagMap: Record<string, string[]>;
  isInpainting: boolean;

  setParallelCount: (count: number) => void;
  setRequestOptions: (key: keyof ImageRequest, value: any) => void;
  getValueForRequestKey: (key: keyof ImageRequest) => any;
  setAllModifiers: (modifiers: ModifiersOptionList) => void;

  setModifierOptions: (key: string, value: any) => void;
  toggleTag: (category: string, tag: string) => void;
  hasTag: (category: string, tag: string) => boolean;
  selectedTags: () => ModifierObject[];
  builtRequest: () => ImageRequest;

  uiOptions: ImageCreationUiOptions;
  toggleUseUpscaling: () => void;
  // isUsingUpscaling: () => boolean
  toggleUseFaceCorrection: () => void;
  isUsingFaceCorrection: () => boolean;
  isUsingUpscaling: () => boolean;
  toggleUseRandomSeed: () => void;
  isRandomSeed: () => boolean;
  toggleUseAutoSave: () => void;
  isUseAutoSave: () => boolean;
  toggleSoundEnabled: () => void;
  isSoundEnabled: () => boolean;
  toggleInpainting: () => void;
}

// devtools breaks TS
export const useImageCreate = create<ImageCreateState>(
  // @ts-expect-error
  devtools((set, get) => ({
    parallelCount: 1,

    requestOptions: {
      session_id: new Date().getTime().toString(),
      prompt: "a photograph of an astronaut riding a horse",
      seed: useRandomSeed(),
      num_outputs: 1,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      width: 512,
      height: 512,
      prompt_strength: 0.8,
      // allow_nsfw: false,
      turbo: true,
      use_cpu: false,
      use_full_precision: true,
      save_to_disk_path: "null",
      use_face_correction: "GFPGANv1.3",
      use_upscale: "RealESRGAN_x4plus",
      show_only_filtered_image: true,
      init_image: undefined,
      sampler: "plms",
      stream_progress_updates: true,
      stream_image_progress: false
    },

    // selected tags
    tags: [] as string[],

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    tagMap: {} as Record<string, string[]>,

    uiOptions: {
      // TODO proper persistence of all UI / user settings centrally somewhere?
      // localStorage.getItem('ui:advancedSettingsIsOpen') === 'true',
      isUseRandomSeed: true,
      isUseAutoSave: false,
      isSoundEnabled: false,
    },

    allModifiers: [] as ModifiersOptionList,

    isInpainting: false,

    setParallelCount: (count: number) =>
      set(
        produce((state) => {
          state.parallelCount = count;
        })
      ),

    setRequestOptions: (key: keyof ImageRequest, value: any) => {
      set(
        produce((state) => {
          state.requestOptions[key] = value;
        })
      );
    },

    getValueForRequestKey: (key: keyof ImageRequest) => {
      return get().requestOptions[key];
    },

    setAllModifiers: (modifiers: ModifiersOptionList) => {
      set(
        produce((state) => {
          state.allModifiers = modifiers;
        })
      );
    },

    toggleTag: (category: string, tag: string) => {
      set(
        produce((state) => {

          if (Object.keys(state.tagMap).includes(category)) {
            if (state.tagMap[category].includes(tag)) {
              state.tagMap[category] = state.tagMap[category].filter((t: string) => t !== tag);
            } else {
              state.tagMap[category].push(tag);
            }
          } else {
            state.tagMap[category] = [tag];
          }


          // const index = state.tags.indexOf(tag);
          // if (index > -1) {
          //   state.tags.splice(index, 1);
          // } else {
          //   state.tags.push(tag);
          // }


        })
      );
    },

    hasTag: (category: string, tag: string) => {
      return get().tagMap[category]?.includes(tag);
    },

    selectedTags: () => {
      // get all the modifiers and all the tags
      const allModifiers = get().allModifiers;
      const selectedTags = get().tagMap;
      let selected: ModifierObject[] = [];

      // for each mappped tag
      for (const [category, tags] of Object.entries(selectedTags)) {
        // find the modifier
        const modifier = allModifiers.find((m) => m.category === category);
        if (modifier) {
          // for each tag in the modifier
          for (const tag of tags) {
            // find the tag
            const tagObject = modifier.modifiers.find((m) => m.modifier === tag);
            if (tagObject) {
              // add the previews to the selected list
              selected = selected.concat({
                ...tagObject,
                category: modifier.category
              });
            }
          }
        }
      }
      return selected;
    },



    // the request body to send to the server
    // this is a computed value, just adding the tags to the request
    builtRequest: () => {
      const state = get();
      const requestOptions = state.requestOptions;
      const selectedTags = get().selectedTags();
      const tags = selectedTags.map((t: ModifierObject) => t.modifier);

      // join all the tags with a comma and add it to the prompt
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const prompt = `${requestOptions.prompt}, ${tags.join(",")}`;

      const request = {
        ...requestOptions,
        prompt,
      };
      // if we arent using auto save clear the save path
      if (!state.uiOptions.isUseAutoSave) {
        // maybe this is "None" ?
        // TODO check this
        request.save_to_disk_path = null;
      }

      if (void 0 === request.init_image) {
        request.prompt_strength = undefined;
      }

      // a bit of a hack. figure out what a clean value to pass to the server is
      // if we arent using upscaling clear the upscaling
      if (request.use_upscale === "") {
        request.use_upscale = null;
      }

      // make sure you look above for the "null" value
      // this patches over a a backend issue if you dont ask for a filtered image
      // you get nothing back

      if (
        null === request.use_upscale &&
        null === request.use_face_correction
      ) {
        request.show_only_filtered_image = false;
      }

      return request;
    },

    toggleUseFaceCorrection: () => {
      set(
        produce((state) => {
          const isSeting =
            typeof state.getValueForRequestKey("use_face_correction") ===
              "string"
              ? null
              : "GFPGANv1.3";
          state.requestOptions.use_face_correction = isSeting;
        })
      );
    },

    isUsingFaceCorrection: () => {
      const isUsing =
        typeof get().getValueForRequestKey("use_face_correction") === "string";
      return isUsing;
    },

    isUsingUpscaling: () => {
      const isUsing = get().getValueForRequestKey("use_upscale") !== "";
      return isUsing;
    },

    toggleUseRandomSeed: () => {
      set(
        produce((state: ImageCreateState) => {
          state.uiOptions.isUseRandomSeed = !state.uiOptions.isUseRandomSeed;
          state.requestOptions.seed = state.uiOptions.isUseRandomSeed
            ? useRandomSeed()
            : state.requestOptions.seed;

          // localStorage.setItem(
          //   "ui:isUseRandomSeed",
          //   state.uiOptions.isUseRandomSeed
          // );
        })
      );
    },

    isRandomSeed: () => {
      return get().uiOptions.isUseRandomSeed;
    },

    toggleUseAutoSave: () => {
      //isUseAutoSave
      //save_to_disk_path
      set(
        produce((state: ImageCreateState) => {
          state.uiOptions.isUseAutoSave = !state.uiOptions.isUseAutoSave;

          // localStorage.setItem(
          //   "ui:isUseAutoSave",
          //   state.uiOptions.isUseAutoSave
          // );
        })
      );
    },

    isUseAutoSave: () => {
      return get().uiOptions.isUseAutoSave;
    },

    toggleSoundEnabled: () => {
      set(
        produce((state: ImageCreateState) => {
          state.uiOptions.isSoundEnabled = !state.uiOptions.isSoundEnabled;
          //localStorage.setItem('ui:isSoundEnabled', state.uiOptions.isSoundEnabled);
        })
      );
    },

    isSoundEnabled: () => {
      return get().uiOptions.isSoundEnabled;
    },

    toggleInpainting: () => {
      set(
        produce((state: ImageCreateState) => {
          state.isInpainting = !state.isInpainting;
        })
      );
    },
  }))
);