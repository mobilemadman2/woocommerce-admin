/** @format */
/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Component, Fragment } from '@wordpress/element';
import { compose } from '@wordpress/compose';
import { decodeEntities } from '@wordpress/html-entities';
import Gridicon from 'gridicons';
import { Button, TabPanel, Tooltip } from '@wordpress/components';
import { withDispatch } from '@wordpress/data';

/**
 * WooCommerce dependencies
 */
import { Card, H } from '@woocommerce/components';
import { getSetting } from '@woocommerce/wc-admin-settings';

/**
 * Internal dependencies
 */
import withSelect from 'wc-api/with-select';
import './style.scss';
import { recordEvent } from 'lib/tracks';
import ThemeUploader from './uploader';
import ThemePreview from './preview';

class Theme extends Component {
	constructor() {
		super( ...arguments );

		this.state = {
			activeTab: 'all',
			chosen: null,
			demo: null,
			uploadedThemes: [],
		};

		this.handleUploadComplete = this.handleUploadComplete.bind( this );
		this.onChoose = this.onChoose.bind( this );
		this.onClosePreview = this.onClosePreview.bind( this );
		this.onSelectTab = this.onSelectTab.bind( this );
		this.openDemo = this.openDemo.bind( this );
	}

	componentDidUpdate( prevProps ) {
		const { isError, isGetProfileItemsRequesting, createNotice } = this.props;
		const { chosen } = this.state;
		const isRequestSuccessful =
			! isGetProfileItemsRequesting && prevProps.isGetProfileItemsRequesting && ! isError && chosen;
		const isRequestError = ! isGetProfileItemsRequesting && prevProps.isRequesting && isError;

		if ( isRequestSuccessful ) {
			/* eslint-disable react/no-did-update-set-state */
			this.setState( { chosen: null } );
			/* eslint-enable react/no-did-update-set-state */
			this.props.goToNextStep();
		}

		if ( isRequestError ) {
			/* eslint-disable react/no-did-update-set-state */
			this.setState( { chosen: null } );
			/* eslint-enable react/no-did-update-set-state */
			createNotice(
				'error',
				__( 'There was a problem selecting your store theme.', 'woocommerce-admin' )
			);
		}
	}

	async onChoose( theme, location = '' ) {
		const { updateProfileItems } = this.props;

		this.setState( { chosen: theme } );
		recordEvent( 'storeprofiler_store_theme_choose', { theme, location } );
		updateProfileItems( { theme } );
	}

	onClosePreview() {
		const { demo } = this.state;
		recordEvent( 'storeprofiler_store_theme_demo_close', { theme: demo.slug } );
		document.body.classList.remove( 'woocommerce-theme-preview-active' );
		this.setState( { demo: null } );
	}

	openDemo( theme ) {
		recordEvent( 'storeprofiler_store_theme_live_demo', { theme: theme.slug } );
		document.body.classList.add( 'woocommerce-theme-preview-active' );
		this.setState( { demo: theme } );
	}

	renderTheme( theme ) {
		const { demo_url, has_woocommerce_support, image, slug, title } = theme;
		const { chosen } = this.state;

		return (
			<Card className="woocommerce-profile-wizard__theme" key={ theme.slug }>
				{ image && (
					<div
						className="woocommerce-profile-wizard__theme-image"
						style={ { backgroundImage: `url(${ image })` } }
						role="img"
						aria-label={ title }
					/>
				) }
				<div className="woocommerce-profile-wizard__theme-details">
					<H className="woocommerce-profile-wizard__theme-name">
						{ title }
						{ ! has_woocommerce_support && (
							<Tooltip
								text={ __( 'This theme does not support WooCommerce.', 'woocommerce-admin' ) }
							>
								<span>
									<Gridicon icon="info" role="img" aria-hidden="true" focusable="false" />
								</span>
							</Tooltip>
						) }
					</H>
					<p className="woocommerce-profile-wizard__theme-status">
						{ this.getThemeStatus( theme ) }
					</p>
					<div className="woocommerce-profile-wizard__theme-actions">
						<Button
							isPrimary={ Boolean( demo_url ) }
							isDefault={ ! Boolean( demo_url ) }
							onClick={ () => this.onChoose( slug, 'card' ) }
							isBusy={ chosen === slug }
						>
							{ __( 'Choose', 'woocommerce-admin' ) }
						</Button>
						{ demo_url && (
							<Button isDefault onClick={ () => this.openDemo( theme ) }>
								{ __( 'Live Demo', 'woocommerce-admin' ) }
							</Button>
						) }
					</div>
				</div>
			</Card>
		);
	}

	getThemeStatus( theme ) {
		const { is_installed, price, slug } = theme;
		const { activeTheme = '' } = getSetting( 'onboarding', {} );

		if ( activeTheme === slug ) {
			return __( 'Currently active theme', 'woocommerce-admin' );
		}
		if ( is_installed ) {
			return __( 'Installed', 'woocommerce-admin' );
		} else if ( this.getPriceValue( price ) <= 0 ) {
			return __( 'Free', 'woocommerce-admin' );
		}

		return sprintf( __( '%s per year', 'woocommerce-admin' ), decodeEntities( price ) );
	}

	onSelectTab( tab ) {
		recordEvent( 'storeprofiler_store_theme_navigate', { navigation: tab } );
		this.setState( { activeTab: tab } );
	}

	getPriceValue( string ) {
		return Number( decodeEntities( string ).replace( /[^0-9.-]+/g, '' ) );
	}

	getThemes() {
		const { activeTab, uploadedThemes } = this.state;
		const { themes = [] } = getSetting( 'onboarding', {} );
		themes.concat( uploadedThemes );
		const allThemes = [ ...themes, ...uploadedThemes ];

		switch ( activeTab ) {
			case 'paid':
				return allThemes.filter( theme => this.getPriceValue( theme.price ) > 0 );
			case 'free':
				return allThemes.filter( theme => this.getPriceValue( theme.price ) <= 0 );
			case 'all':
			default:
				return allThemes;
		}
	}

	handleUploadComplete( upload ) {
		if ( 'success' === upload.status && upload.theme_data ) {
			this.setState( {
				uploadedThemes: [ ...this.state.uploadedThemes, upload.theme_data ],
			} );

			recordEvent( 'storeprofiler_store_theme_upload', { theme: upload.theme_data.slug } );
		}
	}

	render() {
		const themes = this.getThemes();
		const { chosen, demo } = this.state;

		return (
			<Fragment>
				<H className="woocommerce-profile-wizard__header-title">
					{ __( 'Choose a theme', 'woocommerce-admin' ) }
				</H>
				<H className="woocommerce-profile-wizard__header-subtitle">
					{ __(
						"Choose how your store appears to customers. And don't worry, you can always switch themes and edit them later.",
						'woocommerce-admin'
					) }
				</H>
				<TabPanel
					className="woocommerce-profile-wizard__themes-tab-panel"
					activeClass="is-active"
					onSelect={ this.onSelectTab }
					tabs={ [
						{
							name: 'all',
							title: __( 'All themes', 'woocommerce-admin' ),
						},
						{
							name: 'paid',
							title: __( 'Paid themes', 'woocommerce-admin' ),
						},
						{
							name: 'free',
							title: __( 'Free themes', 'woocommerce-admin' ),
						},
					] }
				>
					{ () => (
						<div className="woocommerce-profile-wizard__themes">
							{ themes && themes.map( theme => this.renderTheme( theme ) ) }
							<ThemeUploader onUploadComplete={ this.handleUploadComplete } />
						</div>
					) }
				</TabPanel>
				{ demo && (
					<ThemePreview
						theme={ demo }
						onChoose={ this.onChoose }
						onClose={ this.onClosePreview }
						isBusy={ chosen === demo.slug }
					/>
				) }
			</Fragment>
		);
	}
}

export default compose(
	withSelect( select => {
		const { getProfileItems, getProfileItemsError, isGetProfileItemsRequesting } = select(
			'wc-api'
		);

		return {
			isError: Boolean( getProfileItemsError() ),
			isGetProfileItemsRequesting: isGetProfileItemsRequesting(),
			profileItems: getProfileItems(),
		};
	} ),
	withDispatch( dispatch => {
		const { updateProfileItems } = dispatch( 'wc-api' );
		const { createNotice } = dispatch( 'core/notices' );

		return {
			createNotice,
			updateProfileItems,
		};
	} )
)( Theme );
