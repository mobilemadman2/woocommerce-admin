/** @format */

/**
 * External dependencies
 */
import { without } from 'lodash';

/**
 * Internal dependencies
 */
import { getSetting } from '@woocommerce/wc-admin-settings';

/**
 * Gets the country code from a country:state value string.
 *
 * @format
 * @param {string} countryState Country state string, e.g. US:GA.
 * @return {string} Country string.
 */

export function getCountryCode( countryState ) {
	if ( ! countryState ) {
		return null;
	}

	return countryState.split( ':' )[ 0 ];
}

export function getCurrencyRegion( countryState ) {
	let region = getCountryCode( countryState );
	const euCountries = without( getSetting( 'onboarding', { euCountries: [] } ).euCountries, 'GB' );
	if ( euCountries.includes( region ) ) {
		region = 'EU';
	}

	return region;
}

/**
 * Gets the product IDs for items based on the product types and theme selected in the onboarding profiler.
 *
 * @param {object} profileItems Onboarding profile.
 * @return {array} Product Ids.
 */
export function getProductIdsForCart( profileItems ) {
	const productIds = [];
	const onboarding = getSetting( 'onboarding', {} );
	const productTypes = profileItems.product_types || [];

	productTypes.forEach( productType => {
		if (
			onboarding.productTypes[ productType ] &&
			onboarding.productTypes[ productType ].product
		) {
			productIds.push( onboarding.productTypes[ productType ].product );
		}
	} );

	const theme = onboarding.themes.find( themeData => themeData.slug === profileItems.theme );

	// @todo -- Split out free themes so that they are not considered for purchase, and install those from WordPress.org on the theme step.
	if ( theme && theme.id && ! theme.is_installed ) {
		productIds.push( theme.id );
	}

	return productIds;
}

/**
 * Returns if the onboarding feature of WooCommerce Admin should be enabled.
 *
 * While we preform an a/b test of onboarding, the feature will be enabled within the plugin build,
 * but only if the user recieved the test/opted in.
 *
 * @return {bool} True if the onboarding is enabled.
 */
export function isOnboardingEnabled() {
	if ( ! window.wcAdminFeatures.onboarding ) {
		return false;
	}

	return getSetting( 'onboardingEnabled', false );
}
