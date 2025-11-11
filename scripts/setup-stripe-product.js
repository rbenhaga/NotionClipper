/**
 * Script de configuration Stripe - Création du produit Premium
 *
 * Ce script va :
 * 1. Créer le produit "NotionClipper Premium" sur Stripe
 * 2. Créer le prix 2.99€/mois récurrent
 * 3. Afficher les IDs à copier dans .env
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe-product.js
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Erreur: STRIPE_SECRET_KEY manquante');
  console.log('\n📝 Ajoutez votre clé secrète Stripe dans .env:');
  console.log('   STRIPE_SECRET_KEY=sk_live_...\n');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function setupStripeProduct() {
  console.log('🔷 Configuration Stripe - NotionClipper Premium\n');

  try {
    // 1. Vérifier si le produit existe déjà
    console.log('🔍 Recherche de produits existants...');
    const existingProducts = await stripe.products.list({
      limit: 100,
    });

    let product = existingProducts.data.find(
      p => p.name === 'NotionClipper Premium'
    );

    if (product) {
      console.log(`✅ Produit existant trouvé: ${product.id}\n`);
    } else {
      // 2. Créer le produit
      console.log('📦 Création du produit "NotionClipper Premium"...');

      product = await stripe.products.create({
        name: 'NotionClipper Premium',
        description: 'Débloquez tout le potentiel de NotionClipper : clips illimités, modes premium, et support prioritaire.',
        metadata: {
          app: 'notion-clipper',
          tier: 'premium',
        },
      });

      console.log(`✅ Produit créé: ${product.id}\n`);
    }

    // 3. Vérifier si le prix existe déjà
    console.log('🔍 Recherche de prix existants...');
    const existingPrices = await stripe.prices.list({
      product: product.id,
      limit: 100,
    });

    let price = existingPrices.data.find(
      p => p.unit_amount === 299 && p.currency === 'eur' && p.recurring?.interval === 'month'
    );

    if (price) {
      console.log(`✅ Prix existant trouvé: ${price.id}\n`);
    } else {
      // 4. Créer le prix 2.99€/mois
      console.log('💰 Création du prix 2.99€/mois...');

      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 299, // 2.99€ en centimes
        currency: 'eur',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        metadata: {
          tier: 'premium',
        },
      });

      console.log(`✅ Prix créé: ${price.id}\n`);
    }

    // 5. Afficher le résumé
    console.log('═'.repeat(60));
    console.log('✨ Configuration Stripe terminée avec succès!\n');
    console.log('📋 Copiez ces valeurs dans votre fichier .env:\n');
    console.log(`STRIPE_PREMIUM_PRICE_ID=${price.id}`);
    console.log(`STRIPE_PRODUCT_ID=${product.id}`);
    console.log('\n' + '═'.repeat(60) + '\n');

    // 6. Afficher les détails
    console.log('📊 Détails du produit:');
    console.log(`   Nom: ${product.name}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Description: ${product.description}\n`);

    console.log('💵 Détails du prix:');
    console.log(`   Montant: ${price.unit_amount / 100}€/${price.recurring.interval}`);
    console.log(`   ID: ${price.id}`);
    console.log(`   Devise: ${price.currency.toUpperCase()}\n`);

    console.log('🔗 Liens utiles:');
    console.log(`   Produit: https://dashboard.stripe.com/products/${product.id}`);
    console.log(`   Prix: https://dashboard.stripe.com/prices/${price.id}`);
    console.log(`   Tests: https://dashboard.stripe.com/test/payments\n`);

    console.log('📝 Prochaines étapes:');
    console.log('   1. Copier STRIPE_PREMIUM_PRICE_ID dans .env');
    console.log('   2. Configurer le webhook Stripe');
    console.log('   3. Tester le flow de paiement\n');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration Stripe:');
    console.error(error.message);
    if (error.type) {
      console.error(`   Type: ${error.type}`);
    }
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
  }
}

setupStripeProduct().catch(console.error);
