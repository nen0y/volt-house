export interface Product {
  id: string;
  name: string;
  category: "inverter" | "battery" | "solar";
  price: number;
  originalPrice?: number;
  power?: string;
  capacity?: string;
  efficiency?: string;
  warranty: string;
  badge?: string;
  features: string[];
  image: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatar: string;
  product: string;
}
