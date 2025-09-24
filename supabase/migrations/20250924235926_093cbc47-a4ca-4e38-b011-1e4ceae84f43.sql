-- Create user profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  wallet_address TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for existing tables to be user-specific
-- Update pledge_agreements to be user-specific
DROP POLICY IF EXISTS "Anonymous can read pledge agreements" ON public.pledge_agreements;
CREATE POLICY "Users can view their own pledge agreements" 
ON public.pledge_agreements 
FOR SELECT 
USING (auth.uid()::text = client_address OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create pledge agreements" 
ON public.pledge_agreements 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = client_address);

-- Update client_payments to be user-specific
CREATE POLICY "Users can view their own payments" 
ON public.client_payments 
FOR SELECT 
USING (auth.uid()::text = client_address OR auth.role() = 'service_role');

-- Update investor_purchases - keep anonymous read for public transparency
-- but add user-specific policies
CREATE POLICY "Users can view their own purchases" 
ON public.investor_purchases 
FOR SELECT 
USING (auth.uid()::text = investor_address OR true);

CREATE POLICY "Authenticated users can create purchases" 
ON public.investor_purchases 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = investor_address);