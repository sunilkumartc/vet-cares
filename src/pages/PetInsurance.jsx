
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Shield, PawPrint, Heart, Phone, XCircle, FileText, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const features = [
  {
    icon: Shield,
    title: "Financial Safety Net",
    description: "Covers unexpected vet bills for accidents and illnesses, so you can focus on your pet's recovery, not the cost.",
  },
  {
    icon: PawPrint,
    title: "Access to the Best Care",
    description: "Choose the best possible treatment for your pet without being limited by your budget.",
  },
  {
    icon: Heart,
    title: "Peace of Mind",
    description: "Enjoy peace of mind knowing you are prepared for any health emergencies your furry friend might face.",
  },
];

const coverage = [
  { title: "Accidents & Injuries", description: "Broken bones, foreign object ingestion, cuts, and more." },
  { title: "Illnesses & Diseases", description: "Covers diagnostics and treatments for common and chronic illnesses like cancer, diabetes, and infections." },
  { title: "Surgeries", description: "Includes costs for both emergency and planned surgical procedures." },
  { title: "Hospitalization", description: "Covers costs for overnight stays, nursing care, and intensive care." },
  { title: "Diagnostic Tests", description: "Includes X-rays, blood tests, MRIs, and ultrasounds needed to diagnose a condition." },
  { title: "Prescription Medications", description: "Covers the cost of medicines prescribed by the veterinarian." },
];

const exclusions = [
  { title: "Pre-existing Conditions", description: "Any illness or injury that your pet had before the policy started." },
  { title: "Routine & Preventive Care", description: "Vaccinations, regular check-ups, flea/tick prevention are typically not covered." },
  { title: "Cosmetic Procedures", description: "Procedures like tail docking or ear cropping are excluded." },
  { title: "Breeding Costs", description: "Expenses related to pregnancy, breeding, or whelping are not covered." },
];

const faqs = [
    {
        question: "Is pet insurance really worth it?",
        answer: "For many pet owners, it provides a crucial financial safety net. Unexpected vet bills can run into thousands of rupees. Insurance helps ensure you can afford the best care for your pet without facing financial hardship."
    },
    {
        question: "How does the claim process work?",
        answer: "Typically, you pay the vet bill first and then submit the invoice and necessary documents to the insurance company. They will then reimburse you for the covered amount after your deductible and co-payment."
    },
    {
        question: "What is a 'pre-existing condition'?",
        answer: "A pre-existing condition is any health issue, illness, or injury your pet showed signs of before your insurance policy began. These are generally not covered by any pet insurance provider."
    },
    {
        question: "Can I choose my own veterinarian?",
        answer: "Yes, almost all pet insurance plans allow you to visit any licensed veterinarian in India, including specialists and emergency clinics. You are not restricted to a network."
    }
]

export default function PetInsurancePage() {
  return (
    <div className="bg-gray-50 text-gray-800">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dr. Ravi TenantPet Portal</h1>
                <p className="text-xs text-gray-500">TenantPet Insurance</p>
              </div>
            </Link>
            <a href="tel:08296143115">
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                    <Phone className="w-4 h-4 mr-2" />
                    Call to Enquire
                </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-blue-50">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 tracking-tight">Secure Your TenantPet's Health & Your Wallet</h1>
                <p className="mt-4 max-w-2xl text-lg text-gray-600">
                    With comprehensive pet insurance, you can provide the best medical care for your furry family member without worrying about the cost.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                    <a href="tel:08296143115">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg w-full sm:w-auto">
                            <Phone className="w-5 h-5 mr-2" /> Enquire Now
                        </Button>
                    </a>
                    <a href="#coverage">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto">
                           View Coverage
                        </Button>
                    </a>
                </div>
            </div>
            <div className="md:w-1/2">
                <img src="https://images.unsplash.com/photo-1551717743-49959800b1f6?q=80&w=1200&auto=format&fit=crop" alt="Happy family with golden retriever dog" className="rounded-2xl shadow-xl w-full h-auto" />
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Why TenantPet Insurance is a Smart Choice</h2>
            <p className="mt-2 text-gray-600">Prepare for the unexpected and ensure your pet always gets the care they deserve.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage Section */}
      <section id="coverage" className="py-16 md:py-24 bg-blue-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-900">What's Covered in Our Plans</h2>
            <p className="mt-2 text-gray-600">Our recommended insurance plans offer comprehensive protection.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coverage.map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-md">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                    <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Exclusions Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Common Exclusions</h2>
            <p className="mt-2 text-gray-600">It's important to understand what is not typically covered.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exclusions.map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-6 bg-red-50 rounded-lg border border-red-100">
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                 <div>
                    <h3 className="font-semibold text-lg text-red-800">{item.title}</h3>
                    <p className="text-red-700 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

       {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-lg font-semibold text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-base text-gray-600">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-400">
           <p>© {new Date().getFullYear()} Dr. Ravi TenantPet Portal. All Rights Reserved.</p>
           <p className="text-sm mt-2">Caring for the pets of Malleshwaram, Bengaluru with love and expertise.</p>
        </div>
      </footer>
    </div>
  );
}
