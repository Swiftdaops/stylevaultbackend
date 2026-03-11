import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
{
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Barber",
    required: true,
    index: true,
  },

  plan: {
    type: String,
    enum: ["free", "pro", "premium"],
    default: "free",
  },

  status: {
    type: String,
    enum: ["active", "trialing", "past_due", "cancelled", "expired"],
    default: "active",
  },

  billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "monthly",
  },

  price: {
    type: Number,
    default: 0,
  },

  currency: {
    type: String,
    default: "USD",
  },

  startDate: {
    type: Date,
    default: Date.now,
  },

  endDate: {
    type: Date,
  },

  trialEndsAt: {
    type: Date,
  },

  paymentProvider: {
    type: String,
    enum: ["stripe", "manual", "none"],
    default: "none",
  },

  providerSubscriptionId: {
    type: String,
  },

  features: {
    maxAppointmentsPerMonth: {
      type: Number,
      default: 50,
    },

    maxServices: {
      type: Number,
      default: 5,
    },

    analyticsAccess: {
      type: Boolean,
      default: false,
    },

    customBranding: {
      type: Boolean,
      default: false,
    },

    prioritySupport: {
      type: Boolean,
      default: false,
    }
  },

},
{ timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);