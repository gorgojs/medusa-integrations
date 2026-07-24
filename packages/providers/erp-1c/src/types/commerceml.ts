import {
  Offer,
  Product,
  ProductCharacteristic,
  PropertyValue,
} from "commerceml-parser-core";

type BitrixOffer = Offer & {
  characteristics?: ProductCharacteristic[];
  propertyValues?: PropertyValue[];
};

type BitrixProduct = Omit<Product, "characteristics">;

export * from "commerceml-parser-core";
export { BitrixOffer as Offer, BitrixProduct as Product };
